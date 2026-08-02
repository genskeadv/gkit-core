import * as XLSX from 'xlsx';
import type {
  ClientInputRow,
  CommissionAuditRow,
  CommissionCollaboratorSummaryRow,
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
    label: 'Mensalidade de Assessoria Juridica',
    categoryMatchers: ['mensalidade de assessoria juridica', 'mensalidade de assessoria juridica', 'assessoria juridica', 'assessoria juridica'],
    reductionRate: 0.14,
    commissionRate: 0.015,
    splitBy: 1,
  },
];

export const COMMISSION_WALLET_OVERRIDES = [
  {
    carteira: 'Carteira Aline_Lidiane',
    commissionRate: 1,
    splitBy: 1,
    observacao: '100% da base apos reducao',
  },
  {
    carteira: 'Carteira Vania_Lidiane',
    commissionRate: 1,
    splitBy: 1,
    observacao: '100% da base apos reducao',
  },
];

const COMMISSION_WALLET_ALIASES = [
  {
    carteira: 'Carteira Vania_Lidiane',
    aliases: ['Carteira_Vania', 'Carteira Vania'],
  },
];

const RECEIVABLE_ALIASES = {
  cliente: ['cliente', 'cliente (nome fantasia)', 'cliente (razao social)', 'cliente (razao social)', 'razao social', 'razao social', 'nome completo', 'nome fantasia', 'nome abreviado'],
  documento: ['cliente (cnpj/cpf)', 'cliente (cnpj / cpf)', 'cnpj/cpf', 'cnpj / cpf', 'cnpj', 'cpf', 'documento'],
  categoria: ['categoria', 'tipo', 'tipo de receita'],
  situacao: ['situacao', 'situacao', 'status'],
  valorRecebido: ['valor liquido', 'valor líquido', 'valor líquido recebido', 'valor liquido recebido'],
  vendedor: ['vendedor', 'carteira', 'vendedor padrao', 'vendedor (padrao)'],
};

const CLIENT_ALIASES = {
  cliente: ['razao social / nome completo', 'razao social / nome completo', 'razao social', 'razao social', 'nome completo', 'nome fantasia / nome abreviado', 'nome fantasia', 'nome abreviado'],
  documento: ['cnpj/cpf', 'cnpj / cpf', 'cnpj', 'cpf', 'documento'],
  vendedor: ['vendedor padrao', 'vendedor padrao', 'vendedor (padrao)', 'vendedor (padrao)', 'vendedor', 'carteira'],
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

function titleCaseName(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
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
    throw new Error('Nao encontrei coluna de CNPJ/CPF nem nome do cliente na planilha de clientes ativos. Confira se a planilha exportada tem cabecalho.');
  }
  if (!sellerColumn) {
    throw new Error('Nao encontrei a coluna de vendedor/carteira na planilha de clientes ativos. Procurei por "Vendedor (padrao)" ou "Vendedor padrao".');
  }

  const byDocument = new Map<string, string>();
  const byName = new Map<string, string>();

  for (const row of clientRows) {
    const vendedor = canonicalWalletName(String(row[sellerColumn] ?? '').trim() || 'Sem vendedor');
    const doc = onlyDigits(row[docColumn ?? '']);
    const name = normalizeName(row[clientColumn ?? '']);

    if (doc) byDocument.set(doc, vendedor);
    if (name) byName.set(name, vendedor);
  }

  return { byDocument, byName, columns: { docColumn, clientColumn, sellerColumn } };
}

function matchRule(categoria: string, rules: CommissionRule[] = COMMISSION_RULES): CommissionRule | null {
  const normalizedCategory = normalizeText(categoria);
  return rules.find((rule) => rule.categoryMatchers.some((matcher) => normalizedCategory.includes(normalizeText(matcher)))) ?? null;
}

function isMissingSeller(value: unknown): boolean {
  const normalized = normalizeKey(value);
  return !normalized || normalized === 'sem vendedor' || normalized === 'sem carteira';
}

function canonicalWalletName(carteira: string): string {
  const normalizedCarteira = normalizeKey(carteira);
  const matched = COMMISSION_WALLET_ALIASES.find((row) =>
    row.aliases.some((alias) => normalizeKey(alias) === normalizedCarteira),
  );
  return matched?.carteira ?? carteira;
}

function walletOverride(carteira: string) {
  const normalizedCarteira = normalizeKey(canonicalWalletName(carteira));
  return COMMISSION_WALLET_OVERRIDES.find((override) => normalizeKey(override.carteira) === normalizedCarteira) ?? null;
}

function collaboratorsFromWallet(carteira: string): string[] {
  const cleaned = canonicalWalletName(String(carteira || ''))
    .replace(/^carteira\s+/i, '')
    .replace(/^carteira[_\s-]*/i, '')
    .trim();

  if (!cleaned || isMissingSeller(cleaned)) return ['Sem colaborador'];

  const parts = cleaned
    .split(/[_/&,+]+|\s+e\s+/i)
    .map((part) => titleCaseName(part.trim()))
    .filter(Boolean);

  return parts.length ? Array.from(new Set(parts)) : [titleCaseName(cleaned)];
}

export function buildCollaboratorSummaries(summaries: CommissionSummaryRow[]): CommissionCollaboratorSummaryRow[] {
  return summaries
    .flatMap((summary) => {
      const colaboradores = collaboratorsFromWallet(summary.carteira);
      const percentualRateio = 1 / colaboradores.length;
      let allocatedValorRecebido = 0;
      let allocatedValorAposReducao = 0;
      let allocatedComissao = 0;

      return colaboradores.map((colaborador, index) => {
        const isLast = index === colaboradores.length - 1;
        const valorRecebido = isLast ? round2(summary.valorRecebido - allocatedValorRecebido) : round2(summary.valorRecebido * percentualRateio);
        const valorAposReducao = isLast ? round2(summary.valorAposReducao - allocatedValorAposReducao) : round2(summary.valorAposReducao * percentualRateio);
        const comissaoFinal = isLast ? round2(summary.comissaoFinal - allocatedComissao) : round2(summary.comissaoFinal * percentualRateio);

        allocatedValorRecebido = round2(allocatedValorRecebido + valorRecebido);
        allocatedValorAposReducao = round2(allocatedValorAposReducao + valorAposReducao);
        allocatedComissao = round2(allocatedComissao + comissaoFinal);

        return {
          colaborador,
          carteira: summary.carteira,
          categoria: summary.categoria,
          quantidadeLancamentos: summary.quantidadeLancamentos,
          valorRecebido,
          valorAposReducao,
          comissaoCarteira: summary.comissaoFinal,
          percentualRateio,
          comissaoFinal,
        };
      });
    })
    .sort((a, b) => a.colaborador.localeCompare(b.colaborador) || a.categoria.localeCompare(b.categoria));
}

export function processCommissionWithClients(receivablesBuffer: ArrayBuffer, clientRows: ClientInputRow[], rules: CommissionRule[] = COMMISSION_RULES): CommissionProcessResult {
  const receivableRows = readFirstSheetRows(receivablesBuffer, Object.values(RECEIVABLE_ALIASES)) as ReceivableInputRow[];

  if (!receivableRows.length) {
    throw new Error('Nao encontrei lancamentos na planilha de contas a receber.');
  }
  if (!clientRows.length) {
    throw new Error('Nao encontrei clientes na planilha de clientes ativos.');
  }

  const receivableHeaders = Object.keys(receivableRows[0] ?? {});
  const clienteColumn = findColumn(receivableHeaders, RECEIVABLE_ALIASES.cliente);
  const documentoColumn = findColumn(receivableHeaders, RECEIVABLE_ALIASES.documento);
  const categoriaColumn = findColumn(receivableHeaders, RECEIVABLE_ALIASES.categoria);
  const situacaoColumn = findColumn(receivableHeaders, RECEIVABLE_ALIASES.situacao);
  const valorRecebidoColumn = findColumn(receivableHeaders, RECEIVABLE_ALIASES.valorRecebido);
  const vendedorReceitaColumn = findColumn(receivableHeaders, RECEIVABLE_ALIASES.vendedor);

  const missing = [
    ['Cliente', clienteColumn],
    ['Categoria', categoriaColumn],
    ['Valor Liquido', valorRecebidoColumn],
  ].filter(([, value]) => !value).map(([name]) => name);

  if (missing.length) {
    throw new Error(`Nao encontrei coluna(s) obrigatoria(s) na planilha de contas a receber: ${missing.join(', ')}.`);
  }

  const clientMaps = makeClientMaps(clientRows);

  const enrichedRows: EnrichedReceivableRow[] = receivableRows.map((row, index) => {
    const cliente = String(row[clienteColumn ?? ''] ?? '').trim();
    const documento = onlyDigits(row[documentoColumn ?? '']);
    const categoria = String(row[categoriaColumn ?? ''] ?? '').trim();
    const situacao = String(row[situacaoColumn ?? ''] ?? '').trim();
    const valorRecebido = moneyToNumber(row[valorRecebidoColumn ?? '']);
    const vendedorReceita = String(row[vendedorReceitaColumn ?? ''] ?? '').trim();

    let vendedor = 'Sem vendedor';
    let criterioMatch: EnrichedReceivableRow['criterioMatch'] = 'nao_encontrado';
    let observacao = '';

    if (!isMissingSeller(vendedorReceita)) {
      vendedor = vendedorReceita;
      criterioMatch = documento && clientMaps.byDocument.has(documento)
        ? 'cnpj_cpf'
        : normalizeName(cliente) && clientMaps.byName.has(normalizeName(cliente))
          ? 'nome_cliente'
          : 'nao_encontrado';
      observacao = criterioMatch === 'nao_encontrado'
        ? 'Carteira preenchida pela coluna Vendedor da planilha de receitas; cliente nao encontrado na base de clientes ativos.'
        : '';
    } else if (documento && clientMaps.byDocument.has(documento)) {
      vendedor = clientMaps.byDocument.get(documento) || 'Sem vendedor';
      criterioMatch = 'cnpj_cpf';
    } else {
      const normalizedCliente = normalizeName(cliente);
      if (normalizedCliente && clientMaps.byName.has(normalizedCliente)) {
        vendedor = clientMaps.byName.get(normalizedCliente) || 'Sem vendedor';
        criterioMatch = 'nome_cliente';
        observacao = 'Cruzamento feito por nome porque CNPJ/CPF nao bateu.';
      } else {
        observacao = 'Cliente nao encontrado na base de clientes ativos.';
      }
    }

    if (isMissingSeller(vendedor)) {
      vendedor = 'Sem vendedor';
      observacao = observacao || 'Cliente encontrado, mas sem vendedor/carteira cadastrada.';
    }
    vendedor = canonicalWalletName(vendedor);

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
    const rule = matchRule(row.categoria, rules);

    if (row.valorRecebido <= 0) continue;
    if (!rule) continue;

    if (isMissingSeller(row.vendedor) || row.criterioMatch === 'nao_encontrado') {
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
      const override = walletOverride(item.carteira);
      const percentualComissao = override?.commissionRate ?? item.percentualComissao;
      const divisor = override?.splitBy ?? item.divisor;
      const comissaoTotal = valorAposReducao * percentualComissao;
      const comissaoFinal = comissaoTotal / divisor;

      return {
        ...item,
        valorRecebido: round2(item.valorRecebido),
        valorReducao: round2(valorReducao),
        valorAposReducao: round2(valorAposReducao),
        percentualComissao,
        comissaoTotal: round2(comissaoTotal),
        divisor,
        comissaoFinal: round2(comissaoFinal),
      };
    })
    .sort((a, b) => a.categoria.localeCompare(b.categoria) || b.valorRecebido - a.valorRecebido);

  if (!enrichedRows.some((row) => row.valorRecebido > 0)) {
    throw new Error('Nao encontrei valores liquidos na planilha de contas a receber.');
  }

  return { enrichedRows, summaries, collaboratorSummaries: buildCollaboratorSummaries(summaries), auditRows };
}

export function processCommissionFiles(receivablesBuffer: ArrayBuffer, clientsBuffer: ArrayBuffer, rules: CommissionRule[] = COMMISSION_RULES): CommissionProcessResult {
  const clientRows = readFirstSheetRows(clientsBuffer, Object.values(CLIENT_ALIASES)) as ClientInputRow[];
  return processCommissionWithClients(receivablesBuffer, clientRows, rules);
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
    'Qtde. lancamentos': row.quantidadeLancamentos,
    'Valor liquido': row.valorRecebido,
    'Reducao %': row.reducaoPercentual,
    'Valor reducao': row.valorReducao,
    'Valor apos reducao': row.valorAposReducao,
    'Comissao %': row.percentualComissao,
    'Comissao total': row.comissaoTotal,
    Divisor: row.divisor,
    'Comissao final': row.comissaoFinal,
  }));

  const acordos = resumo.filter((row) => row.Categoria === 'Repasse de Acordos Judiciais');
  const mensalidade = resumo.filter((row) => row.Categoria === 'Mensalidade de Assessoria Juridica');
  const colaboradores = result.collaboratorSummaries.map((row) => ({
    Colaborador: row.colaborador,
    Carteira: row.carteira,
    Categoria: row.categoria,
    'Qtde. lancamentos': row.quantidadeLancamentos,
    'Valor liquido rateado': row.valorRecebido,
    'Valor apos reducao rateado': row.valorAposReducao,
    'Comissao carteira': row.comissaoCarteira,
    'Rateio %': row.percentualRateio,
    'Comissao colaborador': row.comissaoFinal,
  }));
  const excecoesCarteira = COMMISSION_WALLET_OVERRIDES.map((row) => ({
    Carteira: row.carteira,
    Regra: row.observacao,
    'Comissao %': row.commissionRate,
    Divisor: row.splitBy,
  }));

  const enriquecida = result.enrichedRows.map((row) => ({
    Linha: row.linha,
    Cliente: row.cliente,
    'CNPJ/CPF': row.documento,
    Categoria: row.categoria,
    Situacao: row.situacao,
    'Valor liquido': row.valorRecebido,
    Carteira: row.vendedor,
    'Criterio de match': row.criterioMatch,
    Observacao: row.observacao,
  }));

  const auditoria = result.auditRows.map((row) => ({
    Linha: row.linha,
    Cliente: row.cliente,
    'CNPJ/CPF': row.documento,
    Categoria: row.categoria,
    'Valor liquido': row.valorRecebido,
    Carteira: row.vendedor,
    Problema: row.problema,
  }));

  makeSheet(workbook, 'Resumo Comissoes', resumo);
  makeSheet(workbook, 'Acordos Judiciais', acordos);
  makeSheet(workbook, 'Mensalidade Assessoria', mensalidade);
  makeSheet(workbook, 'Comissao Colaboradores', colaboradores);
  makeSheet(workbook, 'Contas com Carteira', enriquecida);
  makeSheet(workbook, 'Auditoria', auditoria);
  makeSheet(workbook, 'Excecoes Carteira', excecoesCarteira);

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}
