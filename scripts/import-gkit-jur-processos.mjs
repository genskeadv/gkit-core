import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { readArg, readLocalEnv } from './env.mjs';

const PROCESSOS_PATH = readArg('processos') || 'C:\\Users\\Genske\\Downloads\\Processo(2).xlsx';
const CARTEIRAS_PATH = readArg('carteiras') || 'D:\\Meu Drive\\DISTRIBUIÇÃO DE CARTEIRAS\\Carteiras 022026.xlsx';
const APPLY = process.argv.includes('--apply');
const REPORT_PATH = readArg('report') || join(process.cwd(), 'tmp', 'gkit-jur-import-report.json');

function envClient() {
  const env = readLocalEnv();
  const url = (env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/^["']|["']$/g, '');
  const key = (env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY || '').replace(/^["']|["']$/g, '');
  if (!url || !key) throw new Error('Supabase env ausente.');
  return createClient(url, key, { auth: { persistSession: false } });
}

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeKey(value) {
  return normalizeText(value).toLowerCase();
}

function normalizeName(value) {
  return normalizeText(value)
    .toUpperCase()
    .replace(/[^\w\s./-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function digits(value) {
  return String(value ?? '').replace(/\D/g, '');
}

function excelDate(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  const text = String(value).trim();
  const br = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return new Date(`${br[3]}-${br[2]}-${br[1]}T00:00:00.000Z`).toISOString();
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function formatCnj(clean) {
  if (clean.length !== 20) return clean;
  return `${clean.slice(0, 7)}-${clean.slice(7, 9)}.${clean.slice(9, 13)}.${clean.slice(13, 14)}.${clean.slice(14, 16)}.${clean.slice(16)}`;
}

const tribunalMap = new Map([
  ['826', { sigla: 'TJSP', alias: 'api_publica_tjsp' }],
  ['819', { sigla: 'TJRJ', alias: 'api_publica_tjrj' }],
  ['813', { sigla: 'TJMG', alias: 'api_publica_tjmg' }],
  ['816', { sigla: 'TJPR', alias: 'api_publica_tjpr' }],
  ['821', { sigla: 'TJRS', alias: 'api_publica_tjrs' }],
  ['403', { sigla: 'TRF3', alias: 'api_publica_trf3' }],
  ['502', { sigla: 'TRT2', alias: 'api_publica_trt2' }],
]);

function tribunalFromCnj(clean) {
  return tribunalMap.get(clean.slice(13, 16)) || { sigla: null, alias: null };
}

function loadSheet(path, sheetName) {
  const workbook = XLSX.read(readFileSync(path), { type: 'buffer', cellDates: true });
  const name = sheetName || workbook.SheetNames[0];
  return XLSX.utils.sheet_to_json(workbook.Sheets[name], { defval: null });
}

function pick(row, ...names) {
  const map = new Map(Object.keys(row).map((key) => [normalizeKey(key), key]));
  for (const name of names) {
    const key = map.get(normalizeKey(name));
    if (key) return row[key];
  }
  return null;
}

async function loadDbMaps(supabase) {
  const [{ data: clientes, error: clientesError }, { data: carteiras, error: carteirasError }, { data: usuarios, error: usuariosError }] = await Promise.all([
    supabase.schema('ciclo').from('clientes').select('id,nome,nome_fantasia,razao_social,documento,cnpj_normalizado').limit(5000),
    supabase.schema('core').from('carteiras').select('id,nome').limit(1000),
    supabase.schema('security').from('usuarios').select('id,nome,email').limit(2000),
  ]);
  if (clientesError) throw new Error(clientesError.message);
  if (carteirasError) throw new Error(carteirasError.message);
  if (usuariosError) throw new Error(usuariosError.message);

  const clientesByName = new Map();
  for (const row of clientes || []) {
    for (const value of [row.nome, row.nome_fantasia, row.razao_social]) {
      const key = normalizeName(value);
      if (key && !clientesByName.has(key)) clientesByName.set(key, row.id);
    }
  }

  const carteirasByName = new Map((carteiras || []).map((row) => [normalizeName(row.nome), row.id]));
  const usuariosByName = new Map();
  for (const row of usuarios || []) {
    const nome = normalizeName(row.nome);
    const email = normalizeName(String(row.email || '').split('@')[0].replace(/[._-]/g, ' '));
    if (nome && !usuariosByName.has(nome)) usuariosByName.set(nome, row.id);
    if (email && !usuariosByName.has(email)) usuariosByName.set(email, row.id);
  }

  return { clientesByName, carteirasByName, usuariosByName };
}

function buildCarteiraMap(rows) {
  const result = new Map();
  for (const row of rows) {
    const cliente = normalizeName(pick(row, 'Cliente'));
    const carteira = normalizeName(pick(row, 'Carteira'));
    const tipo = pick(row, 'Tipo');
    if (cliente && carteira) result.set(cliente, { carteira, tipo });
  }
  return result;
}

function buildPayload(row, carteiraPlanilha, maps) {
  const numeroLimpo = digits(pick(row, 'Número', 'Numero'));
  const clienteNome = normalizeText(pick(row, 'Cliente'));
  const carteiraInfo = carteiraPlanilha.get(normalizeName(clienteNome));
  const carteiraNome = carteiraInfo?.carteira || '';
  const tribunal = tribunalFromCnj(numeroLimpo);
  const responsavel = normalizeName(pick(row, 'Responsável', 'Responsavel'));

  return {
    numero_cnj: formatCnj(numeroLimpo),
    numero_cnj_limpo: numeroLimpo,
    titulo: normalizeText(pick(row, 'Título', 'Titulo')) || null,
    cliente_nome: clienteNome || null,
    cliente_id: maps.clientesByName.get(normalizeName(clienteNome)) || null,
    carteira_id: maps.carteirasByName.get(carteiraNome) || null,
    responsavel_id: maps.usuariosByName.get(responsavel) || null,
    tribunal_sigla: tribunal.sigla,
    tribunal_alias: tribunal.alias,
    classe_nome: normalizeText(pick(row, 'Ação', 'Acao')) || null,
    orgao_julgador_nome: [pick(row, 'Vara'), pick(row, 'Foro')].map(normalizeText).filter(Boolean).join(' - ') || null,
    data_ajuizamento: excelDate(pick(row, 'Data de distribuição', 'Data de distribuicao')),
    ultima_movimentacao_em: excelDate(pick(row, 'Data do último histórico', 'Data do ultimo historico')),
    pasta: normalizeText(pick(row, 'Pasta')) || null,
    url_processo: normalizeText(pick(row, 'URL do Processo')) || null,
    observacoes: normalizeText(pick(row, 'Observações', 'Observacoes')) || null,
    status: pick(row, 'Data de Encerramento') ? 'encerrado' : 'ativo',
    status_monitoramento: 'monitorando',
    importado_de: 'Processo(2).xlsx',
    origem_modulo: 'planilha_processos',
    assuntos: [],
    metadata_datajud: {
      origem: 'planilha_processos',
      papel_cliente: pick(row, 'Papel do cliente'),
      outros_clientes: pick(row, 'Outros clientes'),
      outros_envolvidos: pick(row, 'Outros envolvidos'),
      objeto: pick(row, 'Objeto'),
      materia: pick(row, 'Matéria', 'Materia'),
      detalhes: pick(row, 'Detalhes'),
      etiquetas: pick(row, 'Etiquetas'),
      instancia_original: pick(row, 'Instância Original', 'Instancia Original'),
      instancia_atual: pick(row, 'Instância Atual', 'Instancia Atual'),
      numero_juizo: pick(row, 'Número do Juízo', 'Numero do Juizo'),
      acesso: pick(row, 'Acesso'),
      carteira_planilha: carteiraInfo?.carteira || null,
      tipo_carteira_planilha: carteiraInfo?.tipo || null,
      valores: {
        original: pick(row, 'Valor original'),
        total_envolvido: pick(row, 'Valor total envolvido'),
        provisao: pick(row, 'Valor total da provisão', 'Valor total da provisao'),
        causa: pick(row, 'Valor da causa'),
        condenacao: pick(row, 'Valor da condenação', 'Valor da condenacao'),
      },
    },
  };
}

async function main() {
  const supabase = envClient();
  const processoRows = loadSheet(PROCESSOS_PATH, 'Processos');
  const carteiraRows = loadSheet(CARTEIRAS_PATH);
  const carteiraPlanilha = buildCarteiraMap(carteiraRows);
  const maps = await loadDbMaps(supabase);

  const invalid = [];
  const payloads = [];
  const seen = new Set();
  for (const [index, row] of processoRows.entries()) {
    const clean = digits(pick(row, 'Número', 'Numero'));
    if (clean.length !== 20) {
      invalid.push({ linha: index + 2, numero: pick(row, 'Número', 'Numero'), cliente: pick(row, 'Cliente'), motivo: 'CNJ invalido ou ausente' });
      continue;
    }
    if (seen.has(clean)) {
      invalid.push({ linha: index + 2, numero: pick(row, 'Número', 'Numero'), cliente: pick(row, 'Cliente'), motivo: 'CNJ duplicado na planilha' });
      continue;
    }
    seen.add(clean);
    payloads.push(buildPayload(row, carteiraPlanilha, maps));
  }

  const summary = {
    apply: APPLY,
    totalLinhas: processoRows.length,
    validos: payloads.length,
    invalidos: invalid.length,
    comClienteCiclo: payloads.filter((row) => row.cliente_id).length,
    comCarteira: payloads.filter((row) => row.carteira_id).length,
    comResponsavel: payloads.filter((row) => row.responsavel_id).length,
    porTribunal: payloads.reduce((acc, row) => {
      acc[row.tribunal_sigla || 'SEM_TRIBUNAL'] = (acc[row.tribunal_sigla || 'SEM_TRIBUNAL'] || 0) + 1;
      return acc;
    }, {}),
    invalidosAmostra: invalid.slice(0, 30),
  };

  if (APPLY && payloads.length) {
    for (let i = 0; i < payloads.length; i += 500) {
      const chunk = payloads.slice(i, i + 500);
      const { error } = await supabase
        .schema('gkit_jur')
        .from('processos')
        .upsert(chunk, { onConflict: 'numero_cnj_limpo' });
      if (error) throw new Error(`Erro no lote ${i / 500 + 1}: ${error.message}`);
    }
  }

  writeFileSync(REPORT_PATH, JSON.stringify({ summary, invalid }, null, 2), 'utf8');
  console.log(JSON.stringify(summary, null, 2));
  console.log(`report=${REPORT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
