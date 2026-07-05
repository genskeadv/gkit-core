import * as XLSX from 'xlsx';
import type { PayableImportRow, PayableItem, PayableSummary } from './types';

function normalizeText(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function parseMoney(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value * 100) / 100;
  const text = String(value ?? '').trim();
  if (!text) return 0;
  const cleaned = text
    .replace(/R\$/gi, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0;
}

function parseOfxMoney(value: unknown): number {
  const parsed = Number(String(value ?? '').trim().replace(',', '.'));
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0;
}

function parseDay(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const day = Math.trunc(value);
    return day >= 1 && day <= 31 ? day : null;
  }

  const text = String(value ?? '').trim();
  if (!text) return null;

  const direct = Number(text.replace(/\D/g, ''));
  if (Number.isFinite(direct) && direct >= 1 && direct <= 31 && text.length <= 2) return direct;

  const match = text.match(/(^|\D)(\d{1,2})(\D|$)/);
  if (!match) return null;
  const day = Number(match[2]);
  return day >= 1 && day <= 31 ? day : null;
}

function parseBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  const text = normalizeText(value);
  return ['sim', 's', 'pago', 'paid', 'true', 'verdadeiro', '1', 'x'].includes(text);
}

function parseDelimitedRows(text: string): unknown[][] {
  const firstLine = text.split(/\r?\n/).find((line) => line.trim()) || '';
  const delimiters = [';', ',', '\t'];
  const delimiter = delimiters
    .map((candidate) => ({ candidate, count: firstLine.split(candidate).length - 1 }))
    .sort((a, b) => b.count - a.count)[0]?.candidate || ';';

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  const cleanText = text.replace(/^\uFEFF/, '');

  for (let index = 0; index < cleanText.length; index += 1) {
    const char = cleanText[index];
    const next = cleanText[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      row.push(cell);
      cell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

function decodeFileText(buffer: ArrayBuffer): string {
  const utf8 = new TextDecoder('utf-8').decode(buffer);
  return utf8.includes('\uFFFD') ? new TextDecoder('windows-1252').decode(buffer) : utf8;
}

function findHeaderRow(rows: unknown[][]): number {
  let bestIndex = -1;
  let bestScore = -1;

  rows.forEach((row, index) => {
    const labels = row.map(normalizeText);
    const joined = labels.join(' | ');
    let score = 0;
    if (joined.includes('descricao')) score += 2;
    if (joined.includes('vencimento')) score += 2;
    if (joined.includes('valor previsto') || joined.includes('valor')) score += 2;
    if (joined.includes('categoria')) score += 2;
    if (joined.includes('centro')) score += 1;

    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  if (bestScore < 5 || bestIndex < 0) {
    throw new Error('Nao encontrei a linha de cabecalho. A planilha precisa ter colunas como Descricao, Vencimento, Valor, Categoria e Centro.');
  }

  return bestIndex;
}

function findColumn(headers: string[], accepted: string[]): number {
  const normalizedAccepted = accepted.map(normalizeText);
  const index = headers.findIndex((header) => normalizedAccepted.some((candidate) => header === candidate || header.includes(candidate)));
  return index;
}

function parseBrazilianDateDay(value: unknown): number | null {
  const text = String(value ?? '').trim();
  const match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!match) return parseDay(value);
  const day = Number(match[1]);
  return day >= 1 && day <= 31 ? day : null;
}

function rawRow(headerRow: unknown[], row: unknown[]) {
  const raw: Record<string, unknown> = {};
  headerRow.forEach((label, index) => {
    const key = String(label || `Coluna ${index + 1}`).trim() || `Coluna ${index + 1}`;
    raw[key] = row[index];
  });
  return raw;
}

function parseBankStatementRows(rows: unknown[][]): PayableImportRow[] | null {
  const headerIndex = rows.findIndex((row) => {
    const labels = row.map(normalizeText);
    const joined = labels.join(' | ');
    return joined.includes('valor') && (joined.includes('saldo') || joined.includes('data lancamento'));
  });
  if (headerIndex < 0) return null;

  const headerRow = rows[headerIndex] || [];
  const headers = headerRow.map(normalizeText);
  const dataIndex = findColumn(headers, ['data lancamento', 'data']);
  const descricaoIndex = findColumn(headers, ['descricao', 'historico', 'memo']);
  const valorIndex = findColumn(headers, ['valor']);

  if (dataIndex < 0 || descricaoIndex < 0 || valorIndex < 0) return null;

  const parsed = rows.slice(headerIndex + 1).map((row, offset): PayableImportRow | null => {
    const amount = parseMoney(row[valorIndex]);
    if (!Number.isFinite(amount) || amount >= 0) return null;

    const vencimentoTexto = String(row[dataIndex] ?? '').trim();
    const descricao = String(row[descricaoIndex] ?? '').trim();

    return {
      linha: headerIndex + offset + 2,
      descricao,
      vencimentoDia: parseBrazilianDateDay(vencimentoTexto),
      vencimentoTexto,
      valorPrevisto: Math.abs(amount),
      categoria: 'Sem categoria',
      centro: '',
      pago: true,
      raw: { ...rawRow(headerRow, row), origem_importacao: 'extrato_bancario_csv' },
    } satisfies PayableImportRow;
  }).filter((row): row is PayableImportRow => Boolean(row?.descricao && row.valorPrevisto > 0));

  if (!parsed.length) {
    throw new Error('O extrato bancario foi reconhecido, mas nao encontrei debitos para importar como pagamentos.');
  }

  return parsed;
}

function tagValue(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}>([^<\\r\\n]*)`, 'i'));
  return match?.[1]?.trim() || '';
}

function formatOfxDate(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 8) return value;
  return `${digits.slice(6, 8)}/${digits.slice(4, 6)}/${digits.slice(0, 4)}`;
}

function parseOfxStatement(text: string): PayableImportRow[] | null {
  if (!/<OFX[\s>]/i.test(text)) return null;

  const blocks = Array.from(text.matchAll(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi)).map((match) => match[1]);
  if (!blocks.length) throw new Error('Nao encontrei lancamentos STMTTRN no arquivo OFX.');

  const parsed = blocks.map((block, index): PayableImportRow | null => {
    const amount = parseOfxMoney(tagValue(block, 'TRNAMT'));
    if (!Number.isFinite(amount) || amount >= 0) return null;

    const postedAt = tagValue(block, 'DTPOSTED');
    const memo = tagValue(block, 'MEMO');
    const name = tagValue(block, 'NAME');
    const fitId = tagValue(block, 'FITID');
    const descricao = memo || name || `Lancamento ${fitId || index + 1}`;
    const vencimentoTexto = formatOfxDate(postedAt);
    const day = Number(postedAt.replace(/\D/g, '').slice(6, 8));

    return {
      linha: index + 1,
      descricao,
      vencimentoDia: day >= 1 && day <= 31 ? day : null,
      vencimentoTexto,
      valorPrevisto: Math.abs(amount),
      categoria: 'Sem categoria',
      centro: '',
      pago: true,
      raw: {
        origem_importacao: 'extrato_bancario_ofx',
        trntype: tagValue(block, 'TRNTYPE'),
        dtposted: postedAt,
        trnamt: tagValue(block, 'TRNAMT'),
        fitid: fitId,
        checknum: tagValue(block, 'CHECKNUM'),
        refnum: tagValue(block, 'REFNUM'),
        memo,
        name,
      },
    } satisfies PayableImportRow;
  }).filter((row): row is PayableImportRow => Boolean(row?.descricao && row.valorPrevisto > 0));

  if (!parsed.length) {
    throw new Error('O extrato OFX foi reconhecido, mas nao encontrei debitos para importar como pagamentos.');
  }

  return parsed;
}

export async function parsePayablesWorkbook(file: File): Promise<PayableImportRow[]> {
  const buffer = await file.arrayBuffer();
  const fileName = file.name.toLowerCase();
  const text = decodeFileText(buffer);

  const ofxRows = parseOfxStatement(text);
  if (ofxRows) return ofxRows;

  const isDelimitedText = fileName.endsWith('.csv') || fileName.endsWith('.txt');
  const rows = isDelimitedText ? parseDelimitedRows(text) : (() => {
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new Error('A planilha nao tem abas para leitura.');

    const sheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: '' });
  })();

  const bankStatementRows = parseBankStatementRows(rows);
  if (bankStatementRows) return bankStatementRows;

  const headerIndex = findHeaderRow(rows);
  const headerRow = rows[headerIndex] || [];
  const headers = headerRow.map(normalizeText);

  const descricaoIndex = findColumn(headers, ['descricao', 'descricao', 'fornecedor']);
  const vencimentoIndex = findColumn(headers, ['vencimento', 'dia']);
  const valorIndex = findColumn(headers, ['valor previsto', 'valor']);
  const categoriaIndex = findColumn(headers, ['categoria']);
  const centroIndex = findColumn(headers, ['centro', 'centro de custo']);
  const pagoIndex = findColumn(headers, ['pago', 'status pagamento', 'status']);

  const missing: string[] = [];
  if (descricaoIndex < 0) missing.push('Descricao');
  if (vencimentoIndex < 0) missing.push('Vencimento');
  if (valorIndex < 0) missing.push('Valor');
  if (categoriaIndex < 0) missing.push('Categoria');

  if (missing.length) {
    throw new Error(`Colunas obrigatorias nao encontradas: ${missing.join(', ')}.`);
  }

  const dataRows = rows.slice(headerIndex + 1);
  const parsed = dataRows.map((row, offset) => {
    const descricao = String(row[descricaoIndex] ?? '').trim();
    const vencimentoTexto = String(row[vencimentoIndex] ?? '').trim();
    const valorPrevisto = parseMoney(row[valorIndex]);
    const categoria = String(row[categoriaIndex] ?? '').trim() || 'Sem categoria';
    const centro = centroIndex >= 0 ? String(row[centroIndex] ?? '').trim() : '';
    const pago = pagoIndex >= 0 ? parseBoolean(row[pagoIndex]) : true;

    return {
      linha: headerIndex + offset + 2,
      descricao,
      vencimentoDia: parseDay(row[vencimentoIndex]),
      vencimentoTexto,
      valorPrevisto,
      categoria,
      centro,
      pago,
      raw: rawRow(headerRow, row),
    } satisfies PayableImportRow;
  }).filter((row) => {
    return row.descricao || row.valorPrevisto > 0;
  });

  if (!parsed.length) {
    throw new Error('Nao encontrei pagamentos validos na planilha.');
  }

  return parsed;
}


function formatPaid(value: boolean): string {
  return value ? 'Sim' : 'Nao';
}

export function buildPayablesExportWorkbook(params: {
  competencia: string;
  rows: PayableItem[];
  summary: PayableSummary;
}): Buffer {
  const workbook = XLSX.utils.book_new();

  const importSheetRows = params.rows.map((row) => ({
    'Descricao': row.descricao,
    Vencimento: row.vencimento_dia ?? row.vencimento_texto ?? '',
    'Valor': Number(row.valor_previsto || 0),
    Categoria: row.categoria || 'Sem categoria',
    Centro: row.centro || '',
    Pago: formatPaid(Boolean(row.pago)),
    Origem: row.origem_tipo || 'importacao',
  }));

  const importSheet = XLSX.utils.json_to_sheet(importSheetRows.length ? importSheetRows : [{
    'Descricao': '',
    Vencimento: '',
    'Valor': 0,
    Categoria: '',
    Centro: '',
    Pago: 'Nao',
    Origem: 'importacao',
  }]);
  importSheet['!cols'] = [
    { wch: 46 },
    { wch: 12 },
    { wch: 16 },
    { wch: 26 },
    { wch: 22 },
    { wch: 10 },
    { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(workbook, importSheet, 'Pagamentos');

  const summarySheet = XLSX.utils.json_to_sheet([
    { Indicador: 'Competencia', Valor: params.competencia.slice(0, 7) },
    { Indicador: 'Previsao do mes', Valor: params.summary.total },
    { Indicador: 'Pagamentos efetuados', Valor: params.summary.totalPago },
    { Indicador: 'Diferenca', Valor: params.summary.totalAberto },
    { Indicador: 'Quantidade de lancamentos', Valor: params.summary.quantidade },
    { Indicador: 'Quantidade paga', Valor: params.summary.quantidadePaga },
    { Indicador: 'Observacao', Valor: 'A primeira aba serve como modelo de importacao do extrato realizado. Colaboradores e comissoes tambem devem constar nessa aba quando tiverem sido pagos.' },
  ]);
  summarySheet['!cols'] = [{ wch: 28 }, { wch: 90 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo');

  return XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' }) as Buffer;
}

