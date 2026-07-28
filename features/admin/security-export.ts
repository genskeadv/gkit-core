import { createSupabaseAdminClient } from '@/lib/supabase/admin'

type BackupPayload = {
  generated_at?: string
  target_schemas?: string[]
  applied_migrations?: string[]
  schema?: unknown
  row_counts?: Record<string, number>
  data?: Record<string, Array<Record<string, unknown>>>
  restore_notes?: string[]
}

function timestampForFile(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-')
}

export async function loadSecurityBackup() {
  const supabase = createSupabaseAdminClient() as any
  const { data, error } = await supabase.schema('security').rpc('exportar_backup_app')

  if (error) {
    throw new Error(`Erro ao gerar backup no Supabase: ${error.message}`)
  }

  return {
    payload: data as BackupPayload,
  }
}

function json(value: unknown) {
  return JSON.stringify(value ?? null)
}

function csvCell(value: unknown) {
  const raw = typeof value === 'string' ? value : json(value)
  return `"${raw.replace(/"/g, '""')}"`
}

function csvRow(values: unknown[]) {
  return values.map(csvCell).join(',')
}

function splitTableName(tableKey: string) {
  const [schema, ...tableParts] = tableKey.split('.')
  return {
    schema,
    table: tableParts.join('.'),
  }
}

export function buildSecurityBackupCsv(payload: BackupPayload) {
  const rows = [
    csvRow(['section', 'schema', 'table', 'item', 'index', 'payload_json']),
    csvRow(['meta', '', '', 'generated_at', 0, payload.generated_at ?? null]),
    csvRow(['meta', '', '', 'target_schemas', 0, payload.target_schemas ?? []]),
    csvRow(['meta', '', '', 'applied_migrations', 0, payload.applied_migrations ?? []]),
    csvRow(['schema', '', '', 'catalog', 0, payload.schema ?? {}]),
  ]

  for (const [tableKey, count] of Object.entries(payload.row_counts ?? {})) {
    const { schema, table } = splitTableName(tableKey)
    rows.push(csvRow(['count', schema, table, 'rows', 0, count]))
  }

  for (const [tableKey, tableRows] of Object.entries(payload.data ?? {})) {
    const { schema, table } = splitTableName(tableKey)
    tableRows.forEach((row, index) => {
      rows.push(csvRow(['data', schema, table, 'row', index + 1, row]))
    })
  }

  return `\uFEFF${rows.join('\n')}\n`
}

export function buildSecurityBackupTxt(payload: BackupPayload) {
  const lines = [
    'GKIT Core - Backup de Seguranca',
    `Gerado em: ${payload.generated_at ?? new Date().toISOString()}`,
    '',
    'Avisos',
    ...(payload.restore_notes ?? []).map((note) => `- ${note}`),
    '',
    'Schemas alvo',
    JSON.stringify(payload.target_schemas ?? [], null, 2),
    '',
    'Migrations aplicadas no Supabase',
    JSON.stringify(payload.applied_migrations ?? [], null, 2),
    '',
    'Contagem de linhas',
    JSON.stringify(payload.row_counts ?? {}, null, 2),
    '',
    'Catalogo do schema',
    JSON.stringify(payload.schema ?? {}, null, 2),
    '',
    'Dados por tabela em JSONL',
  ]

  for (const [tableKey, tableRows] of Object.entries(payload.data ?? {})) {
    lines.push('', `--- ${tableKey} (${tableRows.length} linha(s)) ---`)
    tableRows.forEach((row) => lines.push(JSON.stringify(row)))
  }

  return `${lines.join('\n')}\n`
}

export function buildSecurityBackupResponse(format: string, payload: BackupPayload) {
  const safeTimestamp = timestampForFile()

  if (format === 'csv') {
    return {
      body: buildSecurityBackupCsv(payload),
      contentType: 'text/csv; charset=utf-8',
      filename: `gkit-backup-seguranca-${safeTimestamp}.csv`,
    }
  }

  return {
    body: buildSecurityBackupTxt(payload),
    contentType: 'text/plain; charset=utf-8',
    filename: `gkit-backup-seguranca-${safeTimestamp}.txt`,
  }
}
