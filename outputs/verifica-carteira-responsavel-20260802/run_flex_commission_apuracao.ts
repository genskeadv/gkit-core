import fs from 'node:fs';
import path from 'node:path';
import XLSX from 'xlsx';
import { getCommissionRulesForProcessing } from '../../features/gkit-flex/cadastros/masterDataPersistence';
import { getCicloClientesForComissoes } from '../../features/gkit-flex/ciclo-clientes';
import { buildCommissionWorkbook, processCommissionWithClients } from '../../features/gkit-flex/comissoes/commissionProcessor';
import type { CommissionProcessResult } from '../../features/gkit-flex/comissoes/types';

const rootDir = path.resolve(__dirname, '..', '..');
const envPath = path.join(rootDir, '.env.local');
const receivablesPath = 'C:/Users/Genske/Downloads/financas_511214782009144.xlsx';
const outputDir = 'C:/Users/Genske/Documents/gkit-core/outputs/verifica-carteira-responsavel-20260802';
const outputWorkbookPath = path.join(outputDir, 'apuracao_comissoes_flex_financas_511214782009144.xlsx');
const outputJsonPath = path.join(outputDir, 'apuracao_comissoes_flex_financas_511214782009144.json');

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (!match) continue;
    const key = match[1].trim();
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function normalizeText(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function roundMoney(value: number): number {
  return Math.round((value || 0) * 100) / 100;
}

function buildResumo(result: CommissionProcessResult) {
  const commissionSummaries = result.summaries.map((row) => ({ ...row, normalizedCategoria: normalizeText(row.categoria) }));
  const byKey = new Map<string, {
    categoria: string;
    carteira: string;
    quantidadeLancamentos: number;
    valorRecebido: number;
    valorAposReducao: number;
    comissaoFinal: number;
  }>();

  for (const row of result.enrichedRows) {
    if (row.valorRecebido <= 0) continue;

    const normalizedCategoria = normalizeText(row.categoria);
    const matchingCommission = commissionSummaries.find((summary) => (
      normalizedCategoria &&
      summary.carteira === row.vendedor &&
      (summary.normalizedCategoria.includes(normalizedCategoria) || normalizedCategoria.includes(summary.normalizedCategoria))
    ));
    const categoria = matchingCommission?.categoria || row.categoria || 'Sem categoria';
    const carteira = row.vendedor || 'Sem vendedor';
    const key = `${categoria}::${carteira}`;
    const current = byKey.get(key) || {
      categoria,
      carteira,
      quantidadeLancamentos: 0,
      valorRecebido: 0,
      valorAposReducao: 0,
      comissaoFinal: 0,
    };

    current.quantidadeLancamentos += 1;
    current.valorRecebido = roundMoney(current.valorRecebido + row.valorRecebido);
    byKey.set(key, current);
  }

  for (const row of result.summaries) {
    const key = `${row.categoria}::${row.carteira}`;
    const current = byKey.get(key) || {
      categoria: row.categoria,
      carteira: row.carteira,
      quantidadeLancamentos: row.quantidadeLancamentos,
      valorRecebido: row.valorRecebido,
      valorAposReducao: 0,
      comissaoFinal: 0,
    };
    current.valorAposReducao = row.valorAposReducao;
    current.comissaoFinal = row.comissaoFinal;
    byKey.set(key, current);
  }

  return Array.from(byKey.values()).sort((a, b) => a.categoria.localeCompare(b.categoria) || b.valorRecebido - a.valorRecebido);
}

function buildTotals(resumo: ReturnType<typeof buildResumo>) {
  return resumo.reduce(
    (acc, row) => ({
      valorRecebido: roundMoney(acc.valorRecebido + row.valorRecebido),
      valorAposReducao: roundMoney(acc.valorAposReducao + row.valorAposReducao),
      comissaoFinal: roundMoney(acc.comissaoFinal + row.comissaoFinal),
    }),
    { valorRecebido: 0, valorAposReducao: 0, comissaoFinal: 0 },
  );
}

function addJsonSheet(workbook: XLSX.WorkBook, name: string, rows: Record<string, unknown>[]) {
  const sheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Aviso: 'Sem dados para exibir.' }]);
  XLSX.utils.book_append_sheet(workbook, sheet, name.slice(0, 31));
}

async function main() {
  loadEnvFile(envPath);
  fs.mkdirSync(outputDir, { recursive: true });

  const receivablesBuffer = fs.readFileSync(receivablesPath);
  const clientesCiclo = await getCicloClientesForComissoes();
  const commissionRules = await getCommissionRulesForProcessing();
  const result = processCommissionWithClients(
    receivablesBuffer.buffer.slice(receivablesBuffer.byteOffset, receivablesBuffer.byteOffset + receivablesBuffer.byteLength),
    clientesCiclo,
    commissionRules,
  );

  const resumo = buildResumo(result);
  const totals = buildTotals(resumo);
  const workbookBuffer = buildCommissionWorkbook(result);
  const workbook = XLSX.read(workbookBuffer, { type: 'buffer' });

  addJsonSheet(workbook, 'Preview Flex', resumo.map((row) => ({
    Categoria: row.categoria,
    Carteira: row.carteira,
    'Qtde. lancamentos': row.quantidadeLancamentos,
    'Valor liquido': row.valorRecebido,
    'Valor apos reducao': row.valorAposReducao,
    'Comissao final': row.comissaoFinal,
  })));
  addJsonSheet(workbook, 'Regras Usadas', commissionRules.map((rule) => ({
    Regra: rule.label,
    Matchers: rule.categoryMatchers.join('; '),
    'Reducao %': rule.reductionRate,
    'Comissao %': rule.commissionRate,
    Divisor: rule.splitBy,
  })));

  XLSX.writeFile(workbook, outputWorkbookPath);

  const byCommissionSummary = result.summaries.reduce((acc, row) => {
    acc.lancamentos += row.quantidadeLancamentos;
    acc.valorLiquido = roundMoney(acc.valorLiquido + row.valorRecebido);
    acc.valorAposReducao = roundMoney(acc.valorAposReducao + row.valorAposReducao);
    acc.comissaoFinal = roundMoney(acc.comissaoFinal + row.comissaoFinal);
    return acc;
  }, { lancamentos: 0, valorLiquido: 0, valorAposReducao: 0, comissaoFinal: 0 });

  const auditByProblem = Array.from(result.auditRows.reduce((map, row) => {
    const key = row.problema || 'Verificar cadastro de vendedor/carteira.';
    map.set(key, (map.get(key) || 0) + 1);
    return map;
  }, new Map<string, number>()).entries()).map(([problema, quantidade]) => ({ problema, quantidade }));

  const payload = {
    receivablesPath,
    outputWorkbookPath,
    outputJsonPath,
    regrasUsadas: commissionRules,
    previewFlex: resumo,
    colaboradores: result.collaboratorSummaries,
    totaisPreviewFlex: totals,
    totaisComissionaveis: byCommissionSummary,
    auditCount: result.auditRows.length,
    auditoriaPorProblema: auditByProblem,
    auditoria: result.auditRows,
  };

  fs.writeFileSync(outputJsonPath, JSON.stringify(payload, null, 2), 'utf8');
  console.log(JSON.stringify({
    outputWorkbookPath,
    outputJsonPath,
    regras: commissionRules.map((rule) => rule.label),
    totaisPreviewFlex: totals,
    totaisComissionaveis: byCommissionSummary,
    auditCount: result.auditRows.length,
    resumoComissionavel: result.summaries,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
