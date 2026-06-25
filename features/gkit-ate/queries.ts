import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { requireModuleAccess } from '@/lib/auth/platform'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type {
  GkitAteAtendimento,
  GkitAteAtendimentoDetail,
  GkitAteAtendimentoTipo,
  GkitAteDashboardData,
  GkitAteFormData,
  GkitAteHealth,
  GkitAteImportacao,
  GkitAteListRow,
  GkitAteStatus,
  GkitAteTarefa,
  GkitAteTarefaStatus,
  GkitAteTarefaTipo,
  GkitAteTone,
} from '@/features/gkit-ate/types'

function admin() {
  return createSupabaseAdminClient() as any
}

function text(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatBRL(value: unknown) {
  const parsed = Number(value ?? 0)
  if (!Number.isFinite(parsed) || parsed === 0) return ''
  return parsed.toLocaleString('pt-BR', { currency: 'BRL', style: 'currency' })
}

function dateLabel(value: unknown) {
  const raw = text(value)
  if (!raw) return 'Sem data'
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return raw
  return new Intl.DateTimeFormat('pt-BR').format(date)
}

function dateTimeLabel(value: unknown) {
  const raw = text(value)
  if (!raw) return 'Sem data'
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return raw
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date)
}

function atendimentoStatus(value: unknown): GkitAteStatus {
  return value === 'encerrado' ? 'encerrado' : 'aberto'
}

function tarefaStatus(value: unknown): GkitAteTarefaStatus {
  if (value === 'em_andamento' || value === 'concluida' || value === 'cancelada') return value
  return 'pendente'
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    aberto: 'Aberto',
    encerrado: 'Encerrado',
    pendente: 'Pendente',
    em_andamento: 'Em andamento',
    concluida: 'Concluida',
    cancelada: 'Cancelada',
    concluido: 'Concluido',
    parcial: 'Parcial',
    falhou: 'Falhou',
    processando: 'Processando',
  }
  return labels[status] ?? status
}

function tone(status: string): GkitAteTone {
  if (['encerrado', 'concluida', 'concluido'].includes(status)) return 'success'
  if (['aberto', 'pendente', 'em_andamento', 'processando', 'parcial'].includes(status)) return 'warning'
  if (['cancelada', 'falhou', 'erro'].includes(status)) return 'danger'
  return 'primary'
}

function schemaHealth(error: any): GkitAteHealth | null {
  if (!error) return null

  if (error.code === 'PGRST106' || String(error.message ?? '').includes('Invalid schema: gkit_ate')) {
    return {
      ok: false,
      title: 'Expor schema gkit_ate no Supabase',
      message: 'O modulo ATE ja tem codigo, mas o schema gkit_ate ainda nao esta visivel para a API.',
      detail: 'Supabase > Project Settings > API > Exposed schemas: adicionar gkit_ate. Depois recarregue o app.',
    }
  }

  if (error.code === '42501' || String(error.message ?? '').includes('permission denied')) {
    return {
      ok: false,
      title: 'Liberar grants do schema gkit_ate',
      message: 'A API do Supabase nao tem permissao para ler o schema gkit_ate.',
      detail: 'Execute sql/45_gkit_ate_bootstrap.sql no SQL Editor e confirme os grants para service_role.',
    }
  }

  return {
    ok: false,
    title: 'Falha ao ler dados do GKIT ATE',
    message: text(error.message, 'O Supabase retornou erro ao consultar o modulo.'),
    detail: text(error.code, 'Verifique logs e configuracao do schema.'),
  }
}

export async function getGkitAteHealth(): Promise<GkitAteHealth> {
  const { error } = await admin()
    .schema('gkit_ate')
    .from('atendimentos')
    .select('id', { count: 'exact', head: true })

  return schemaHealth(error) ?? { ok: true }
}

export async function requireGkitAteContext(target?: string) {
  const context = await requireModuleAccess('gkit-ate', target)
  const hasAccess =
    canAccess(context.permissions, 'gkit_ate.dashboard.read') ||
    canAccess(context.permissions, 'gkit_ate.atendimentos.read') ||
    canAccess(context.permissions, 'gkit_ate.tarefas.read')

  if (!hasAccess) redirect('/plataforma')
  return context
}

export function canWriteGkitAte(permissions: string[], permission: string) {
  return canAccess(permissions, permission)
}

function taskCounts(rows: Array<Record<string, any>>) {
  return rows.reduce<Record<string, { total: number; pendentes: number }>>((acc, row) => {
    const atendimentoId = text(row.atendimento_id)
    if (!atendimentoId) return acc
    acc[atendimentoId] = acc[atendimentoId] ?? { total: 0, pendentes: 0 }
    acc[atendimentoId].total += 1
    if (tarefaStatus(row.status) === 'pendente' || tarefaStatus(row.status) === 'em_andamento') {
      acc[atendimentoId].pendentes += 1
    }
    return acc
  }, {})
}

function mapAtendimento(row: Record<string, any>, counts: Record<string, { total: number; pendentes: number }>): GkitAteAtendimento {
  const id = String(row.id)
  return {
    id,
    codigo_publico: text(row.codigo_publico),
    source_key: text(row.source_key),
    astrea_codigo: text(row.astrea_codigo) || null,
    atendimento_tipo_id: text(row.atendimento_tipo_id) || null,
    tipo: text(row.tipo) || null,
    titulo: text(row.titulo, 'Atendimento'),
    cliente_nome: text(row.cliente_nome, 'Cliente nao informado'),
    outros_envolvidos: text(row.outros_envolvidos) || null,
    objeto: text(row.objeto) || null,
    observacoes: text(row.observacoes) || null,
    etiquetas: Array.isArray(row.etiquetas) ? row.etiquetas.map(String) : [],
    data_criacao: text(row.data_criacao) || null,
    prazo_finalizacao: text(row.prazo_finalizacao) || null,
    data_encerramento: text(row.data_encerramento) || null,
    data_ultimo_historico: text(row.data_ultimo_historico) || null,
    ultimo_historico: text(row.ultimo_historico) || null,
    url_processo: text(row.url_processo) || null,
    responsavel: text(row.responsavel) || null,
    acesso: text(row.acesso) || null,
    status: atendimentoStatus(row.status),
    tarefas_total: counts[id]?.total ?? 0,
    tarefas_pendentes: counts[id]?.pendentes ?? 0,
  }
}

export async function listGkitAteAtendimentos(): Promise<GkitAteAtendimento[]> {
  const supabase = admin()
  const [atendimentos, tarefas] = await Promise.all([
    supabase.schema('gkit_ate').from('atendimentos').select('*').order('data_criacao', { ascending: false }).limit(1000),
    supabase.schema('gkit_ate').from('tarefas').select('atendimento_id,status').limit(5000),
  ])

  if (atendimentos.error) return []
  const counts = taskCounts((tarefas.data ?? []) as Array<Record<string, any>>)
  return ((atendimentos.data ?? []) as Array<Record<string, any>>).map((row) => mapAtendimento(row, counts))
}

export async function listGkitAteTarefas(): Promise<GkitAteTarefa[]> {
  const supabase = admin()
  const [tarefas, atendimentos, tipos] = await Promise.all([
    supabase.schema('gkit_ate').from('tarefas').select('*').order('data_prevista', { ascending: true }).order('criado_em', { ascending: false }).limit(1000),
    supabase.schema('gkit_ate').from('atendimentos').select('id,titulo,cliente_nome,status').limit(2000),
    supabase.schema('gkit_ate').from('tarefa_tipos').select('id,nome').limit(1000),
  ])

  if (tarefas.error) return []
  const taskRows = (tarefas.data ?? []) as Array<Record<string, any>>
  const openCounts = taskRows.reduce<Record<string, number>>((acc, row) => {
    const atendimentoId = text(row.atendimento_id)
    if (atendimentoId && ['pendente', 'em_andamento'].includes(tarefaStatus(row.status))) {
      acc[atendimentoId] = (acc[atendimentoId] ?? 0) + 1
    }
    return acc
  }, {})
  const atendimentoMap = new Map<string, { titulo: string; cliente: string; status: GkitAteStatus }>(
    ((atendimentos.data ?? []) as Array<Record<string, any>>).map((row) => [
      String(row.id),
      { titulo: text(row.titulo, 'Atendimento'), cliente: text(row.cliente_nome, 'Cliente'), status: atendimentoStatus(row.status) },
    ]),
  )
  const tipoMap = new Map<string, string>(((tipos.data ?? []) as Array<Record<string, any>>).map((row) => [String(row.id), text(row.nome, 'Tipo')]))

  return taskRows.map((row) => {
    const atendimento = atendimentoMap.get(text(row.atendimento_id))
    const atendimentoId = text(row.atendimento_id)
    const status = tarefaStatus(row.status)
    return {
      id: String(row.id),
      atendimento_id: atendimentoId,
      atendimento_status: atendimento?.status ?? 'aberto',
      atendimento_titulo: atendimento?.titulo ?? 'Atendimento',
      cliente_nome: atendimento?.cliente ?? 'Cliente',
      tarefa_tipo_id: text(row.tarefa_tipo_id) || null,
      tipo_nome: tipoMap.get(text(row.tarefa_tipo_id)) ?? null,
      descricao: text(row.descricao, 'Tarefa'),
      responsavel: text(row.responsavel) || null,
      data_prevista: text(row.data_prevista) || null,
      data_conclusao: text(row.data_conclusao) || null,
      status,
      origem: text(row.origem, 'manual'),
      outras_tarefas_abertas: Math.max((openCounts[atendimentoId] ?? 0) - (['pendente', 'em_andamento'].includes(status) ? 1 : 0), 0),
    }
  })
}

export function atendimentoRows(atendimentos: GkitAteAtendimento[]): GkitAteListRow[] {
  return atendimentos.map((item) => ({
    id: item.id,
    title: item.titulo,
    subtitle: `${item.codigo_publico} - ${item.cliente_nome} - ${item.responsavel ?? 'Sem responsavel'}`,
    status: statusLabel(item.status),
    value: item.tipo ?? item.astrea_codigo ?? 'ASTREA',
    meta: `${item.tarefas_pendentes}/${item.tarefas_total} tarefa(s) pendente(s)`,
    detailHref: `/modulos/gkit-ate/atendimentos/${item.id}`,
    tone: tone(item.status),
  }))
}

export function tarefaRows(tarefas: GkitAteTarefa[]): GkitAteListRow[] {
  return tarefas.map((item) => ({
    id: item.id,
    title: item.descricao,
    subtitle: `${item.cliente_nome} - ${item.atendimento_titulo}`,
    status: statusLabel(item.status),
    value: dateLabel(item.data_prevista),
    meta: item.tipo_nome ?? item.responsavel ?? 'Sem responsavel',
    detailHref: `/modulos/gkit-ate/tarefas/${item.id}`,
    tone: tone(item.status),
  }))
}

export async function getGkitAteDashboardData(): Promise<GkitAteDashboardData> {
  const [health, atendimentos, tarefas] = await Promise.all([
    getGkitAteHealth(),
    listGkitAteAtendimentos(),
    listGkitAteTarefas(),
  ])

  const abertos = atendimentos.filter((item) => item.status === 'aberto')
  const encerrados = atendimentos.filter((item) => item.status === 'encerrado')
  const pendentes = tarefas.filter((item) => item.status === 'pendente' || item.status === 'em_andamento')
  const responsavelMap = atendimentos.reduce<Record<string, { total: number; abertos: number }>>((acc, item) => {
    const key = item.responsavel ?? 'Sem responsavel'
    acc[key] = acc[key] ?? { total: 0, abertos: 0 }
    acc[key].total += 1
    if (item.status === 'aberto') acc[key].abertos += 1
    return acc
  }, {})

  return {
    cards: [
      { label: 'Atendimentos', value: String(atendimentos.length), hint: `${abertos.length} aberto(s)` },
      { label: 'Encerrados', value: String(encerrados.length), hint: 'historico importado' },
      { label: 'Clientes', value: String(new Set(atendimentos.map((item) => item.cliente_nome)).size), hint: 'base ASTREA' },
      { label: 'Responsaveis', value: String(new Set(atendimentos.map((item) => item.responsavel ?? 'Sem responsavel')).size), hint: 'operacao consultiva' },
      { label: 'Tarefas', value: String(pendentes.length), hint: `${tarefas.length} total` },
    ],
    atendimentos: atendimentoRows(atendimentos.slice(0, 8)),
    tarefas: tarefaRows(pendentes.slice(0, 8)),
    porResponsavel: Object.entries(responsavelMap)
      .sort(([, a], [, b]) => b.total - a.total)
      .slice(0, 8)
      .map(([responsavel, item]) => ({
        id: responsavel,
        title: responsavel,
        subtitle: `${item.total} atendimento(s)`,
        status: item.abertos ? 'Com abertos' : 'Sem abertos',
        value: String(item.abertos),
        meta: 'aberto(s)',
        tone: item.abertos ? 'warning' : 'success',
      })),
    health,
  }
}

export async function getGkitAteAtendimento(id: string): Promise<GkitAteAtendimentoDetail> {
  const supabase = admin()
  const [atendimento, tarefas] = await Promise.all([
    supabase.schema('gkit_ate').from('atendimentos').select('*').eq('id', id).single(),
    supabase.schema('gkit_ate').from('tarefas').select('*').eq('atendimento_id', id).order('data_prevista', { ascending: true }),
  ])

  if (atendimento.error || !atendimento.data) throw new Error(atendimento.error?.message ?? 'Atendimento nao encontrado.')
  if (tarefas.error) throw new Error(tarefas.error.message)

  const row = atendimento.data as Record<string, any>
  const base = mapAtendimento(row, taskCounts((tarefas.data ?? []) as Array<Record<string, any>>))
  const mappedTasks = ((tarefas.data ?? []) as Array<Record<string, any>>).map((task) => ({
    id: String(task.id),
    atendimento_id: id,
    atendimento_status: base.status,
    atendimento_titulo: base.titulo,
    cliente_nome: base.cliente_nome,
    tarefa_tipo_id: text(task.tarefa_tipo_id) || null,
    tipo_nome: null,
    descricao: text(task.descricao, 'Tarefa'),
    responsavel: text(task.responsavel) || null,
    data_prevista: text(task.data_prevista) || null,
    data_conclusao: text(task.data_conclusao) || null,
    status: tarefaStatus(task.status),
    origem: text(task.origem, 'manual'),
    outras_tarefas_abertas: 0,
  }))

  return {
    ...base,
    papel_cliente: text(row.papel_cliente) || null,
    outros_clientes: text(row.outros_clientes) || null,
    pasta: text(row.pasta) || null,
    acao: text(row.acao) || null,
    numero: text(row.numero) || null,
    data_distribuicao: text(row.data_distribuicao) || null,
    materia: text(row.materia) || null,
    detalhes: text(row.detalhes) || null,
    valores: [
      { label: 'Valor original', value: formatBRL(row.valor_original) },
      { label: 'Total envolvido', value: formatBRL(row.valor_total_envolvido) },
      { label: 'Provisao', value: formatBRL(row.valor_total_provisao) },
      { label: 'Causa', value: formatBRL(row.valor_causa) },
      { label: 'Condenacao', value: formatBRL(row.valor_condenacao) },
    ].filter((item) => item.value),
    decisao_processo: text(row.decisao_processo) || null,
    resultado_processo: text(row.resultado_processo) || null,
    instancia_original: text(row.instancia_original) || null,
    instancia_atual: text(row.instancia_atual) || null,
    numero_juizo: text(row.numero_juizo) || null,
    vara: text(row.vara) || null,
    foro: text(row.foro) || null,
    tarefas: mappedTasks,
  }
}

export async function getGkitAteTarefa(id: string): Promise<GkitAteTarefa> {
  const supabase = admin()
  const { data, error } = await supabase.schema('gkit_ate').from('tarefas').select('*').eq('id', id).single()
  if (error || !data) throw new Error(error?.message ?? 'Tarefa nao encontrada.')

  const row = data as Record<string, any>
  const atendimentoId = text(row.atendimento_id)
  const [atendimento, tipo, abertas] = await Promise.all([
    supabase.schema('gkit_ate').from('atendimentos').select('id,titulo,cliente_nome,status').eq('id', atendimentoId).single(),
    text(row.tarefa_tipo_id)
      ? supabase.schema('gkit_ate').from('tarefa_tipos').select('id,nome').eq('id', text(row.tarefa_tipo_id)).maybeSingle()
      : { data: null, error: null },
    supabase
      .schema('gkit_ate')
      .from('tarefas')
      .select('id')
      .eq('atendimento_id', atendimentoId)
      .in('status', ['pendente', 'em_andamento']),
  ])

  const atendimentoRow = (atendimento.data ?? {}) as Record<string, any>
  const status = tarefaStatus(row.status)
  return {
    id: String(row.id),
    atendimento_id: atendimentoId,
    atendimento_status: atendimentoStatus(atendimentoRow.status),
    atendimento_titulo: text(atendimentoRow.titulo, 'Atendimento'),
    cliente_nome: text(atendimentoRow.cliente_nome, 'Cliente'),
    tarefa_tipo_id: text(row.tarefa_tipo_id) || null,
    tipo_nome: text((tipo.data as Record<string, any> | null)?.nome) || null,
    descricao: text(row.descricao, 'Tarefa'),
    responsavel: text(row.responsavel) || null,
    data_prevista: text(row.data_prevista) || null,
    data_conclusao: text(row.data_conclusao) || null,
    status,
    origem: text(row.origem, 'manual'),
    outras_tarefas_abertas: Math.max(((abertas.data ?? []) as Array<Record<string, any>>).filter((item) => text(item.id) !== String(row.id)).length, 0),
  }
}

export async function getGkitAteFormData(): Promise<GkitAteFormData> {
  const [atendimentos, atendimentoTipos, tarefaTipos] = await Promise.all([
    admin()
      .schema('gkit_ate')
      .from('atendimentos')
      .select('id,codigo_publico,titulo,cliente_nome,status')
      .eq('status', 'aberto')
      .order('data_criacao', { ascending: false })
      .limit(500),
    admin().schema('gkit_ate').from('atendimento_tipos').select('id,nome').eq('ativo', true).order('nome', { ascending: true }).limit(300),
    admin().schema('gkit_ate').from('tarefa_tipos').select('id,nome,descricao_padrao').eq('ativo', true).order('nome', { ascending: true }).limit(300),
  ])

  return {
    atendimentos: ((atendimentos.data ?? []) as Array<Record<string, any>>).map((row) => ({
      id: String(row.id),
      label: `${text(row.codigo_publico, 'ATE')} - ${text(row.titulo, 'Atendimento')} - ${text(row.cliente_nome, 'Cliente')}`,
      status: atendimentoStatus(row.status),
    })),
    atendimentoTipos: ((atendimentoTipos.data ?? []) as Array<Record<string, any>>).map((row) => ({
      id: String(row.id),
      label: text(row.nome, 'Tipo de atendimento'),
    })),
    tarefaTipos: ((tarefaTipos.data ?? []) as Array<Record<string, any>>).map((row) => ({
      id: String(row.id),
      label: text(row.nome, 'Tipo de tarefa'),
      descricaoPadrao: text(row.descricao_padrao) || undefined,
    })),
  }
}

export async function listGkitAteAtendimentoTipos(): Promise<GkitAteAtendimentoTipo[]> {
  const [tipos, tarefas] = await Promise.all([
    admin().schema('gkit_ate').from('atendimento_tipos').select('id,nome,tarefa_tipo_id,ativo,criado_em').order('nome', { ascending: true }).limit(1000),
    admin().schema('gkit_ate').from('tarefa_tipos').select('id,nome').limit(1000),
  ])

  if (tipos.error) return []
  const tarefaMap = new Map<string, string>(
    ((tarefas.data ?? []) as Array<Record<string, any>>).map((row) => [String(row.id), text(row.nome, 'Tarefa')]),
  )

  return ((tipos.data ?? []) as Array<Record<string, any>>).map((row) => {
    const tarefaTipoId = text(row.tarefa_tipo_id) || null
    return {
      ativo: row.ativo !== false,
      criado_em: text(row.criado_em),
      id: String(row.id),
      label: text(row.nome, 'Tipo de atendimento'),
      tarefaTipoId,
      tarefaTipoNome: tarefaTipoId ? tarefaMap.get(tarefaTipoId) ?? null : null,
    }
  })
}

export async function listGkitAteTarefaTipos(): Promise<GkitAteTarefaTipo[]> {
  const { data, error } = await admin()
    .schema('gkit_ate')
    .from('tarefa_tipos')
    .select('id,nome,descricao_padrao,ativo,criado_em')
    .order('nome', { ascending: true })
    .limit(1000)

  if (error) return []
  return ((data ?? []) as Array<Record<string, any>>).map((row) => ({
    ativo: row.ativo !== false,
    criado_em: text(row.criado_em),
    descricaoPadrao: text(row.descricao_padrao, 'Descricao padrao'),
    id: String(row.id),
    label: text(row.nome, 'Tipo de tarefa'),
  }))
}

export async function listGkitAteImportacoes(): Promise<GkitAteImportacao[]> {
  const { data, error } = await admin()
    .schema('gkit_ate')
    .from('import_lotes')
    .select('*')
    .order('criado_em', { ascending: false })
    .limit(100)

  if (error) return []
  return ((data ?? []) as Array<Record<string, any>>).map((row) => ({
    id: String(row.id),
    tipo: text(row.tipo, 'astrea_processos'),
    status: text(row.status, 'processando'),
    arquivo_nome: text(row.arquivo_nome) || null,
    total_linhas: numberValue(row.total_linhas),
    linhas_validas: numberValue(row.linhas_validas),
    atendimentos_criados: numberValue(row.atendimentos_criados),
    atendimentos_atualizados: numberValue(row.atendimentos_atualizados),
    linhas_ignoradas: numberValue(row.linhas_ignoradas),
    erro: text(row.erro) || null,
    criado_em: text(row.criado_em),
    finalizado_em: text(row.finalizado_em) || null,
  }))
}

export function importacaoRows(rows: GkitAteImportacao[]): GkitAteListRow[] {
  return rows.map((row) => ({
    id: row.id,
    title: row.arquivo_nome ?? 'Importacao ASTREA',
    subtitle: `${row.linhas_validas}/${row.total_linhas} linha(s) validas`,
    status: statusLabel(row.status),
    value: `${row.atendimentos_criados} novo(s)`,
    meta: `${row.atendimentos_atualizados} atualizado(s) - ${dateTimeLabel(row.criado_em)}`,
    tone: tone(row.status),
  }))
}
