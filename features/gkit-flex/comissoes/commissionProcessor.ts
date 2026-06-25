import * as XLSX from 'xlsx';
import type {
  ClientInputRow,
  CommissionAuditRow,
  CommissionProcessResult,
  CommissionRule,
  CommissionSummaryRow,
  EnrichedReceivableRow,
  ReceivableInputRow,
} from './types';

export const COMMISSION_RULES: CommissionRule[] = [
  {
    key: 'acordos_judiciais',
    label: 'Repasse de Acordos Judiciais',
    categoryMatchers: ['repasse de acordos judiciais', 'acordos judiciais', 'acordo judicial'],
    reductionRate: 0.15,
    commissionRate: 0.10,
    splitBy: 2,
  },
  {
    key: 'mensalidade_assessoria',
    label: 'Mensalidade de Assessoria Jurídica',
    categoryMatchers: ['mensalidade de assessoria juridica', 'mensalidade de assessoria jurídica', 'assessoria juridica', 'assessoria jurídica'],
    reductionRate: 0.14,
    commissionRate: 0.015,
    splitBy: 1,
  },
];

const RECEIVABLE_ALIASES = {
  cliente: ['cliente', 'cliente (nome fantasia)', 'cliente (razao social)', 'cliente (razão social)', 'razao social', 'razão social', 'nome completo', 'nome fantasia', 'nome abreviado'],
  documento: ['cliente (cnpj/cpf)', 'cliente (cnpj / cpf)', 'cnpj/cpf', 'cnpj / cpf', 'cnpj', 'cpf', 'documento'],
  categoria: ['categoria', 'tipo', 'tipo de receita'],
  situacao: ['situação', 'situacao', 'status'],
  valorRecebido: ['valor recebido', 'recebido', 'valor pago'],
};

const CLIENT_ALIASES = {
  cliente: ['razao social / nome completo', 'razão social / nome completo', 'razao social', 'razão social', 'nome completo', 'nome fantasia / nome abreviado', 'nome fantasia', 'nome abreviado'],
  documento: ['cnpj/cpf', 'cnpj / cpf', 'cnpj', 'cpf', 'documento'],
  vendedor: ['vendedor padrão', 'vendedor padrao', 'vendedor (padrão)', 'vendedor (padrao)', 'vendedor', 'carteira'],
};

function normalizeText(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function normalizeKey(value: unknown): string {
  return normalizeText(value).replace(/\s+/g, ' ');
}

function onlyDigits(value: unknown): string {
  return String(value ?? '').replace(/\D/g, '');
}

function normalizeName(value: unknown): string {
  return normalizeText(value).replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function moneyToNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const raw = String(value ?? '').trim();
  if (!raw) return 0;

  const cleaned = raw
    .replace(/R\$/gi, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^0-9.-]/g, '');

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function findColumn(headers: string[], aliases: string[]): string | null {
  const normalizedHeaders = headers.map((header) => ({ original: header, normalized: normalizeKey(header) }));
  const normalizedAliases = aliases.map(normalizeKey);

  const exact = normalizedHeaders.find((header) => normalizedAliases.includes(header.normalized));
  if (exact) return exact.original;

  const contains = normalizedHeaders.find((header) =>
    normalizedAliases.some((alias) => header.normalized.includes(alias) || alias.includes(header.normalized)),
  );
  return contains?.original ?? null;
}

function headerScore(row: unknown[], aliases: string[][]): number {
  const cells = row.map(normalizeKey).filter(Boolean);
  if (!cells.length) return 0;

  const flatAliases = aliases.flat().map(normalizeKey);
  let score = 0;

  for (const cell of cells) {
    if (flatAliases.includes(cell)) {
      score += 2;
      continue;
    }
    if (flatAliases.some((alias) => cell.includes(alias) || alias.includes(cell))) {
      score += 1;
    }
  }

  return score;
}

function detectHeaderRow(matrix: unknown[][], aliases: string[][]): number {
  let bestIndex = 0;
  let bestScore = -1;

  const limit = Math.min(matrix.length, 20);
  for (let index = 0; index < limit; index += 1) {
    const score = headerScore(matrix[index] ?? [], aliases);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  }

  return bestScore >= 2 ? bestIndex : 0;
}

function dedupeHeaders(headers: unknown[]): string[] {
  const used = new Map<string, number>();

  return headers.map((header, index) => {
    const base = String(header ?? '').trim() || `Coluna ${index + 1}`;
    const count = used.get(base) ?? 0;
    used.set(base, count + 1);
    return count === 0 ? base : `${base}_${count + 1}`;
  });
}

function readFirstSheetRows(buffer: ArrayBuffer, aliases: string[][]): Record<string, unknown>[] {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    raw: true,
    blankrows: false,
  });

  if (!matrix.length) return [];

  const headerIndex = detectHeaderRow(matrix, aliases);
  const headers = dedupeHeaders(matrix[headerIndex] ?? []);
  const rows: Record<string, unknown>[] = [];

  for (const values of matrix.slice(headerIndex + 1)) {
    const hasAnyValue = values.some((value) => String(value ?? '').trim() !== '');
    if (!hasAnyValue) continue;

    const row: Record<string, unknown> = {};
    headers.forEach((header, colIndex) => {
      row[header] = values[colIndex] ?? '';
    });
    rows.push(row);
  }

  return rows;
}

function makeClientMaps(clientRows: ClientInputRow[]) {
  const headers = Object.keys(clientRows[0] ?? {});
  const docColumn = findColumn(headers, CLIENT_ALIASES.documento);
  const clientColumn = findColumn(headers, CLIENT_ALIASES.cliente);
  const sellerColumn = findColumn(headers, CLIENT_ALIASES.vendedor);

  if (!docColumn && !clientColumn) {
    throw new Error('Não encontrei coluna de CNPJ/CPF nem nome do cliente na planilha de clientes ativos. Confira se a planilha exportada tem cabeçalho.');
  }
  if (!sellerColumn) {
    throw new Error('Não encontrei a coluna de vendedor/carteira na planilha de clientes ativos. Procurei por “Vendedor (padrão)” ou “Vendedor padrão”.');
  }

  const byDocument = new Map<string, string>();
  const byName = new Map<string, string>();

  for (const row of clientRows) {
    const vendedor = String(row[sellerColumn] ?? '').trim() || 'Sem vendedor';
    const doc = onlyDigits(row[docColumn ?? '']);
    const name = normalizeName(row[clientColumn ?? '']);

    if (doc) byDocument.set(doc, vendedor);
    if (name) byName.set(name, vendedor);
  }

  return { byDocument, byName, columns: { docColumn, clientColumn, sellerColumn } };
}

function matchRule(categoria: string): CommissionRule | null {
  const normalizedCategory = normalizeText(categoria);
  return COMMISSION_RULES.find((rule) => rule.categoryMatchers.some((matcher) => normalizedCategory.includes(normalizeText(matcher)))) ?? null;
}

export function processCommissionWithClients(receivablesBuffer: ArrayBuffer, clientRows: ClientInputRow[]): CommissionProcessResult {
  const receivableRows = readFirstSheetRows(receivablesBuffer, Object.values(RECEIVABLE_ALIASES)) as ReceivableInputRow[];

  if (!receivableRows.length) {
    throw new Error('Não encontrei lançamentos na planilha de contas a receber.');
  }
  if (!clientRows.length) {
    throw new Error('Não encontrei clientes na planilha de clientes ativos.');
  }

  const receivableHeaders = Object.keys(receivableRows[0] ?? {});
  const clienteColumn = findColumn(receivableHeaders, RECEIVABLE_ALIASES.cliente);
  const documentoColumn = findColumn(receivableHeaders, RECEIVABLE_ALIASES.documento);
  const categoriaColumn = findColumn(receivableHeaders, RECEIVABLE_ALIASES.categoria);
  const situacaoColumn = findColumn(receivableHeaders, RECEIVABLE_ALIASES.situacao);
  const valorRecebidoColumn = findColumn(receivableHeaders, RECEIVABLE_ALIASES.valorRecebido);

  const missing = [
    ['Cliente', clienteColumn],
    ['Categoria', categoriaColumn],
    ['Valor Recebido', valorRecebidoColumn],
  ].filter(([, value]) => !value).map(([name]) => name);

  if (missing.length) {
    throw new Error(`Não encontrei coluna(s) obrigatória(s) na planilha de contas a receber: ${missing.join(', ')}.`);
  }

  const clientMaps = makeClientMaps(clientRows);

  const enrichedRows: EnrichedReceivableRow[] = receivableRows.map((row, index) => {
    const cliente = String(row[clienteColumn ?? ''] ?? '').trim();
    const documento = onlyDigits(row[documentoColumn ?? '']);
    const categoria = String(row[categoriaColumn ?? ''] ?? '').trim();
    const situacao = String(row[situacaoColumn ?? ''] ?? '').trim();
    const valorRecebido = moneyToNumber(row[valorRecebidoColumn ?? '']);

    let vendedor = 'Sem vendedor';
    let criterioMatch: EnrichedReceivableRow['criterioMatch'] = 'nao_encontrado';
    let observacao = '';

    if (documento && clientMaps.byDocument.has(documento)) {
      vendedor = clientMaps.byDocument.get(documento) || 'Sem vendedor';
      criterioMatch = 'cnpj_cpf';
    } else {
      const normalizedCliente = normalizeName(cliente);
      if (normalizedCliente && clientMaps.byName.has(normalizedCliente)) {
        vendedor = clientMaps.byName.get(normalizedCliente) || 'Sem vendedor';
        criterioMatch = 'nome_cliente';
        observacao = 'Cruzamento feito por nome porque CNPJ/CPF não bateu.';
      } else {
        observacao = 'Cliente não encontrado na base de clientes ativos.';
      }
    }

    if (!vendedor || vendedor === 'Sem vendedor') {
      vendedor = 'Sem vendedor';
      observacao = observacao || 'Cliente encontrado, mas sem vendedor/carteira cadastrada.';
    }

    return {
      linha: index + 2,
      cliente,
      documento,
      categoria,
      situacao,
      valorRecebido,
      vendedor,
      criterioMatch,
      observacao,
      raw: row,
    };
  });

  const summaryMap = new Map<string, CommissionSummaryRow>();
  const auditRows: CommissionAuditRow[] = [];

  for (const row of enrichedRows) {
    const rule = matchRule(row.categoria);

    if (row.valorRecebido <= 0) continue;
    if (!rule) continue;

    if (row.vendedor === 'Sem vendedor' || row.criterioMatch === 'nao_encontrado') {
      auditRows.push({
        linha: row.linha,
        cliente: row.cliente,
        documento: row.documento,
        categoria: row.categoria,
        valorRecebido: row.valorRecebido,
        vendedor: row.vendedor,
        problema: row.observacao || 'Verificar cadastro de vendedor/carteira.',
      });
    }

    const key = `${rule.key}::${row.vendedor}`;
    const current = summaryMap.get(key) ?? {
      categoria: rule.label,
      carteira: row.vendedor,
      quantidadeLancamentos: 0,
      valorRecebido: 0,
      reducaoPercentual: rule.reductionRate,
      valorReducao: 0,
      valorAposReducao: 0,
      percentualComissao: rule.commissionRate,
      comissaoTotal: 0,
      divisor: rule.splitBy,
      comissaoFinal: 0,
    };

    current.quantidadeLancamentos += 1;
    current.valorRecebido += row.valorRecebido;
    summaryMap.set(key, current);
  }

  const summaries = Array.from(summaryMap.values())
    .map((item) => {
      const valorReducao = item.valorRecebido * item.reducaoPercentual;
      const valorAposReducao = item.valorRecebido - valorReducao;
      const comissaoTotal = valorAposReducao * item.percentualComissao;
      const comissaoFinal = comissaoTotal / item.divisor;

      return {
        ...item,
        valorRecebido: round2(item.valorRecebido),
        valorReducao: round2(valorReducao),
        valorAposReducao: round2(valorAposReducao),
        comissaoTotal: round2(comissaoTotal),
        comissaoFinal: round2(comissaoFinal),
      };
    })
    .sort((a, b) => a.categoria.localeCompare(b.categoria) || b.valorRecebido - a.valorRecebido);

  if (!summaries.length) {
    throw new Error('Não encontrei valores recebidos nas categorias com regra de comissão: Repasse de Acordos Judiciais ou Mensalidade de Assessoria Jurídica.');
  }

  return { enrichedRows, summaries, auditRows };
}

export function processCommissionFiles(receivablesBuffer: ArrayBuffer, clientsBuffer: ArrayBuffer): CommissionProcessResult {
  const clientRows = readFirstSheetRows(clientsBuffer, Object.values(CLIENT_ALIASES)) as ClientInputRow[];
  return processCommissionWithClients(receivablesBuffer, clientRows);
}

function makeSheet(workbook: XLSX.WorkBook, name: string, rows: Record<string, unknown>[]) {
  const sheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Aviso: 'Sem dados para exibir.' }]);
  XLSX.utils.book_append_sheet(workbook, sheet, name.slice(0, 31));
}

export function buildCommissionWorkbook(result: CommissionProcessResult): Buffer {
  const workbook = XLSX.utils.book_new();

  const resumo = result.summaries.map((row) => ({
    Categoria: row.categoria,
    Carteira: row.carteira,
    'Qtde. lançamentos': row.quantidadeLancamentos,
    'Valor recebido': row.valorRecebido,
    'Redução %': row.reducaoPercentual,
    'Valor redução': row.valorReducao,
    'Valor após redução': row.valorAposReducao,
    'Comissão %': row.percentualComissao,
    'Comissão total': row.comissaoTotal,
    Divisor: row.divisor,
    'Comissão final': row.comissaoFinal,
  }));

  const acordos = resumo.filter((row) => row.Categoria === 'Repasse de Acordos Judiciais');
  const mensalidade = resumo.filter((row) => row.Categoria === 'Mensalidade de Assessoria Jurídica');

  const enriquecida = result.enrichedRows.map((row) => ({
    Linha: row.linha,
    Cliente: row.cliente,
    'CNPJ/CPF': row.documento,
    Categoria: row.categoria,
    Situação: row.situacao,
    'Valor recebido': row.valorRecebido,
    Carteira: row.vendedor,
    'Critério de match': row.criterioMatch,
    Observação: row.observacao,
  }));

  const auditoria = result.auditRows.map((row) => ({
    Linha: row.linha,
    Cliente: row.cliente,
    'CNPJ/CPF': row.documento,
    Categoria: row.categoria,
    'Valor recebido': row.valorRecebido,
    Carteira: row.vendedor,
    Problema: row.problema,
  }));

  makeSheet(workbook, 'Resumo Comissões', resumo);
  makeSheet(workbook, 'Acordos Judiciais', acordos);
  makeSheet(workbook, 'Mensalidade Assessoria', mensalidade);
  makeSheet(workbook, 'Contas com Carteira', enriquecida);
  makeSheet(workbook, 'Auditoria', auditoria);

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}
