import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const envPath = '.env.local'
const apply = process.argv.includes('--apply')

function loadEnv() {
  if (!fs.existsSync(envPath)) throw new Error(`Arquivo ${envPath} nao encontrado.`)
  const entries = fs
    .readFileSync(envPath, 'utf8')
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const index = line.indexOf('=')
      return [line.slice(0, index), line.slice(index + 1).replace(/^['"]|['"]$/g, '')]
    })

  return Object.fromEntries(entries)
}

const env = loadEnv()
const url = env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  throw new Error('Env ausente: NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY.')
}

const supabase = createClient(url, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

const cleanedTables = [
  'conciliacoes',
  'pagamentos',
  'pagamento_agendas',
  'comissoes',
  'validacao_itens',
  'validacoes',
  'sugestoes',
  'orcamentos',
  'previsoes_despesa',
  'despesas_recorrentes',
  'extrato_lancamentos',
  'extratos',
  'receitas',
  'importacao_itens',
  'importacoes',
  'fechamento_checklist',
  'fechamentos',
  'eventos',
  'receita_mapeamentos',
  'regras_classificacao',
]

const preservedTables = [
  'colaboradores',
  'times',
  'time_membros',
  'categorias_financeiras',
  'tipos_comissao',
  'receita_categoria_mapeamentos',
  'despesa_categoria_mapeamentos',
]

async function countRows(table) {
  const { count, error } = await supabase
    .schema('flex')
    .from(table)
    .select('*', { count: 'exact', head: true })

  if (error) throw new Error(`${table}: ${JSON.stringify(error)}`)
  return count ?? 0
}

async function deleteRows(table) {
  const { count, error } = await supabase
    .schema('flex')
    .from(table)
    .delete({ count: 'exact' })
    .not('id', 'is', null)

  if (error?.code === '42501') {
    throw new Error([
      `${table}: permissao negada para service_role.`,
      'Execute primeiro o arquivo sql/98_flex_clean_homologation.sql no SQL Editor do Supabase.',
      'Ele libera os grants e faz a limpeza transacional da base Flex.',
    ].join(' '))
  }
  if (error) throw new Error(`${table}: ${JSON.stringify(error)}`)
  return count ?? 0
}

async function snapshot(tables) {
  const rows = []
  for (const table of tables) {
    try {
      rows.push({ table, rows: await countRows(table) })
    } catch (error) {
      rows.push({ table, rows: `erro: ${error.message}` })
    }
  }
  return rows
}

console.log(apply ? 'Limpando base Flex para homologacao...' : 'Dry run: nenhuma linha sera removida.')

console.log('\nPreservadas:')
console.table(await snapshot(preservedTables))

console.log('\nAntes da limpeza:')
console.table(await snapshot(cleanedTables))

if (apply) {
  const deleted = []
  for (const table of cleanedTables) {
    deleted.push({ table, deleted: await deleteRows(table) })
  }
  console.log('\nRemovidas:')
  console.table(deleted)
}

console.log('\nDepois da limpeza:')
console.table(await snapshot(cleanedTables))
