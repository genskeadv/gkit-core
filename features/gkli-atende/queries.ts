import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { requirePlatformContext } from '@/lib/auth/platform'
import type { PlatformUsuario } from '@/lib/auth/platform'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

type TaskStatus = 'pendente' | 'em_andamento' | 'concluida' | 'cancelada'

export type GkliAtendeTone = 'neutral' | 'primary' | 'warning' | 'danger' | 'success'

export type GkliAtendeCard = {
  label: string
  value: string
  hint: string
  tone: GkliAtendeTone
}

export type GkliAtendeTask = {
  id: string
  atendimentoId: string
  atendimentoTitulo: string
  atendimentoCodigo: string
  clienteNome: string
  descricao: string
  responsavel: string
  tipoNome: string
  dataPrevista: string
  dataPrevistaLabel: string
  status: TaskStatus
  statusLabel: string
  prazoTone: GkliAtendeTone
  outrasTarefasAbertas: number
  searchable: string
}

export type GkliAtendeAtendimento = {
  id: string
  codigo: string
  clienteNome: string
  titulo: string
  tipo: string
  responsavel: string
  dataCriacao: string
  dataCriacaoLabel: string
  prazoFinalizacao: string
  prazoFinalizacaoLabel: string
  tarefasPendentes: number
  tarefasTotal: number
  searchable: string
}

export type GkliAtendeClientGroup = {
  cliente: string
  atendimentos: GkliAtendeAtendimento[]
  tarefas: GkliAtendeTask[]
  total: number
  tarefasPendentes: number
  tarefasAtrasadas: number
  tarefasHoje: number
  tarefasEmAndamento: number
  searchable: string
}

export type GkliAtendeData = {
  usuarioNome: string
  cards: GkliAtendeCard[]
  groups: GkliAtendeClientGroup[]
  totalAtendimentos: number
  totalTarefas: number
}

function admin() {
  return createSupabaseAdminClient() as any
}

function text(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function normalize(value: unknown) {
  return text(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function taskStatus(value: unknown): TaskStatus {
  if (value === 'em_andamento' || value === 'concluida' || value === 'cancelada') return value
  return 'pendente'
}

function dateLabel(value: unknown) {
  const raw = text(value)
  if (!raw) return 'Sem prazo'
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return raw
  return new Intl.DateTimeFormat('pt-BR').format(date)
}

function localDateKey(value: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(value)
}

function rawDateKey(value: unknown) {
  const raw = text(value)
  if (!raw) return ''
  return raw.slice(0, 10)
}

function prazoTone(value: unknown): GkliAtendeTone {
  const key = rawDateKey(value)
  if (!key) return 'neutral'
  const today = localDateKey(new Date())
  if (key < today) return 'danger'
  if (key === today) return 'warning'
  return 'success'
}

function statusLabel(status: TaskStatus) {
  const labels: Record<TaskStatus, string> = {
    pendente: 'Pendente',
    em_andamento: 'Em andamento',
    concluida: 'Concluída',
    cancelada: 'Cancelada',
  }
  return labels[status]
}

function userAliases(usuario: PlatformUsuario) {
  const emailName = text(usuario.email).split('@')[0]
  return [usuario.nome, emailName].map(normalize).filter(Boolean)
}

function matchesUser(value: unknown, aliases: string[]) {
  const candidate = normalize(value)
  return Boolean(candidate && aliases.some((alias) => candidate === alias || candidate.includes(alias)))
}

function hasGkliAtendeAccess(context: Awaited<ReturnType<typeof requirePlatformContext>>) {
  if (context.usuario.tipo === 'admin_global' || context.permissions.includes('*')) return true

  return (
    context.modules.some((modulo) => modulo.codigo === 'gkli-atende' || modulo.codigo === 'gkit-ate') ||
    canAccess(context.permissions, 'gkli_atende.read') ||
    canAccess(context.permissions, 'gkit_ate.dashboard.read') ||
    canAccess(context.permissions, 'gkit_ate.atendimentos.read') ||
    canAccess(context.permissions, 'gkit_ate.tarefas.read')
  )
}

export async function requireGkliAtendeContext(target = '/modulos/gkli-atende') {
  const context = await requirePlatformContext(target)

  if (!hasGkliAtendeAccess(context)) {
    redirect('/plataforma')
  }

  return context
}

export function canWriteGkliAtende(permissions: string[]) {
  return (
    canAccess(permissions, 'gkli_atende.write') ||
    canAccess(permissions, 'gkit_ate.tarefas.write') ||
    canAccess(permissions, 'gkit_ate.atendimentos.write')
  )
}

function taskCounts(rows: Array<Record<string, any>>) {
  return rows.reduce<Record<string, { total: number; pendentes: number }>>((acc, row) => {
    const atendimentoId = text(row.atendimento_id)
    if (!atendimentoId) return acc
    acc[atendimentoId] = acc[atendimentoId] ?? { total: 0, pendentes: 0 }
    acc[atendimentoId].total += 1
    if (['pendente', 'em_andamento'].includes(taskStatus(row.status))) {
      acc[atendimentoId].pendentes += 1
    }
    return acc
  }, {})
}

export async function getGkliAtendeData(usuario: PlatformUsuario): Promise<GkliAtendeData> {
  const aliases = userAliases(usuario)
  const supabase = admin()
  const [tarefas, atendimentos, tipos] = await Promise.all([
    supabase
      .schema('gkit_ate')
      .from('tarefas')
      .select('*')
      .order('data_prevista', { ascending: true })
      .order('criado_em', { ascending: true })
      .limit(5000),
    supabase
      .schema('gkit_ate')
      .from('atendimentos')
      .select('id,codigo_publico,astrea_codigo,titulo,cliente_nome,tipo,responsavel,status,data_criacao,prazo_finalizacao')
      .order('data_criacao', { ascending: true })
      .limit(5000),
    supabase.schema('gkit_ate').from('tarefa_tipos').select('id,nome').limit(1000),
  ])

  if (tarefas.error) throw new Error(tarefas.error.message)
  if (atendimentos.error) throw new Error(atendimentos.error.message)

  const taskRows = (tarefas.data ?? []) as Array<Record<string, any>>
  const atendimentoRows = (atendimentos.data ?? []) as Array<Record<string, any>>
  const tipoMap = new Map<string, string>(
    ((tipos.data ?? []) as Array<Record<string, any>>).map((row) => [String(row.id), text(row.nome, 'Tarefa')]),
  )
  const atendimentoMap = new Map<string, Record<string, any>>(atendimentoRows.map((row) => [String(row.id), row]))
  const counts = taskCounts(taskRows)
  const openTasksByAtendimento = taskRows.reduce<Record<string, number>>((acc, row) => {
    const atendimentoId = text(row.atendimento_id)
    if (atendimentoId && ['pendente', 'em_andamento'].includes(taskStatus(row.status))) {
      acc[atendimentoId] = (acc[atendimentoId] ?? 0) + 1
    }
    return acc
  }, {})

  const openTasks = taskRows
    .filter((row) => ['pendente', 'em_andamento'].includes(taskStatus(row.status)))
    .filter((row) => {
      const atendimento = atendimentoMap.get(text(row.atendimento_id))
      return matchesUser(row.responsavel, aliases) || matchesUser(atendimento?.responsavel, aliases)
    })
    .map<GkliAtendeTask>((row) => {
      const atendimentoId = text(row.atendimento_id)
      const atendimento = atendimentoMap.get(atendimentoId) ?? {}
      const status = taskStatus(row.status)
      const clienteNome = text(atendimento.cliente_nome, 'Cliente não informado')
      const atendimentoTitulo = text(atendimento.titulo, 'Atendimento')
      const tipoNome = tipoMap.get(text(row.tarefa_tipo_id)) ?? 'Tarefa'
      const searchable = normalize([
        clienteNome,
        atendimentoTitulo,
        text(atendimento.codigo_publico),
        tipoNome,
        text(row.descricao),
        text(row.responsavel),
      ].join(' '))

      return {
        id: String(row.id),
        atendimentoId,
        atendimentoTitulo,
        atendimentoCodigo: text(atendimento.codigo_publico),
        clienteNome,
        descricao: text(row.descricao, 'Tarefa'),
        responsavel: text(row.responsavel, text(atendimento.responsavel, 'Sem responsável')),
        tipoNome,
        dataPrevista: text(row.data_prevista),
        dataPrevistaLabel: dateLabel(row.data_prevista),
        status,
        statusLabel: statusLabel(status),
        prazoTone: prazoTone(row.data_prevista),
        outrasTarefasAbertas: Math.max((openTasksByAtendimento[atendimentoId] ?? 0) - 1, 0),
        searchable,
      }
    })

  const taskAtendimentoIds = new Set(openTasks.map((task) => task.atendimentoId))
  const openAtendimentos = atendimentoRows
    .filter((row) => text(row.status, 'aberto') === 'aberto')
    .filter((row) => taskAtendimentoIds.has(String(row.id)) || matchesUser(row.responsavel, aliases))
    .map<GkliAtendeAtendimento>((row) => {
      const id = String(row.id)
      const clienteNome = text(row.cliente_nome, 'Cliente não informado')
      const titulo = text(row.titulo, 'Atendimento')
      const searchable = normalize([
        clienteNome,
        titulo,
        text(row.codigo_publico),
        text(row.tipo),
        text(row.responsavel),
      ].join(' '))

      return {
        id,
        codigo: text(row.codigo_publico),
        clienteNome,
        titulo,
        tipo: text(row.tipo, 'Atendimento'),
        responsavel: text(row.responsavel, 'Sem responsável'),
        dataCriacao: text(row.data_criacao),
        dataCriacaoLabel: dateLabel(row.data_criacao),
        prazoFinalizacao: text(row.prazo_finalizacao),
        prazoFinalizacaoLabel: dateLabel(row.prazo_finalizacao),
        tarefasPendentes: counts[id]?.pendentes ?? 0,
        tarefasTotal: counts[id]?.total ?? 0,
        searchable,
      }
    })

  const grouped = new Map<string, GkliAtendeClientGroup>()
  const ensureGroup = (cliente: string) => {
    const key = cliente || 'Cliente não informado'
    const current = grouped.get(key)
    if (current) return current
    const next: GkliAtendeClientGroup = {
      cliente: key,
      atendimentos: [],
      tarefas: [],
      total: 0,
      tarefasPendentes: 0,
      tarefasAtrasadas: 0,
      tarefasHoje: 0,
      tarefasEmAndamento: 0,
      searchable: normalize(key),
    }
    grouped.set(key, next)
    return next
  }

  for (const task of openTasks) {
    const group = ensureGroup(task.clienteNome)
    group.tarefas.push(task)
  }

  for (const atendimento of openAtendimentos) {
    const group = ensureGroup(atendimento.clienteNome)
    group.atendimentos.push(atendimento)
  }

  const groups = Array.from(grouped.values()).map((group) => {
    const uniqueAtendimentos = new Map<string, GkliAtendeAtendimento>()
    for (const atendimento of group.atendimentos) {
      uniqueAtendimentos.set(atendimento.id, atendimento)
    }
    for (const task of group.tarefas) {
      const atendimento = openAtendimentos.find((item) => item.id === task.atendimentoId)
      if (atendimento) uniqueAtendimentos.set(atendimento.id, atendimento)
    }

    const tarefasAtrasadas = group.tarefas.filter((task) => task.prazoTone === 'danger').length
    const tarefasHoje = group.tarefas.filter((task) => task.prazoTone === 'warning').length
    const tarefasEmAndamento = group.tarefas.filter((task) => task.status === 'em_andamento').length
    const atendimentosDoGrupo = Array.from(uniqueAtendimentos.values())
    const searchable = normalize([
      group.cliente,
      ...group.tarefas.map((task) => task.searchable),
      ...atendimentosDoGrupo.map((atendimento) => atendimento.searchable),
    ].join(' '))

    return {
      ...group,
      atendimentos: atendimentosDoGrupo,
      total: group.tarefas.length + atendimentosDoGrupo.length,
      tarefasPendentes: group.tarefas.length,
      tarefasAtrasadas,
      tarefasHoje,
      tarefasEmAndamento,
      searchable,
    }
  }).sort((a, b) => {
    if (b.tarefasAtrasadas !== a.tarefasAtrasadas) return b.tarefasAtrasadas - a.tarefasAtrasadas
    if (b.tarefasHoje !== a.tarefasHoje) return b.tarefasHoje - a.tarefasHoje
    return a.cliente.localeCompare(b.cliente, 'pt-BR')
  })

  const atrasadas = openTasks.filter((task) => task.prazoTone === 'danger').length
  const hoje = openTasks.filter((task) => task.prazoTone === 'warning').length
  const emAndamento = openTasks.filter((task) => task.status === 'em_andamento').length

  return {
    usuarioNome: text(usuario.nome, 'Usuário'),
    groups,
    totalAtendimentos: openAtendimentos.length,
    totalTarefas: openTasks.length,
    cards: [
      { label: 'Tarefas', value: String(openTasks.length), hint: `${emAndamento} em andamento`, tone: 'primary' },
      { label: 'Atrasadas', value: String(atrasadas), hint: 'exigem ação', tone: atrasadas > 0 ? 'danger' : 'success' },
      { label: 'Hoje', value: String(hoje), hint: 'vencem agora', tone: hoje > 0 ? 'warning' : 'neutral' },
      { label: 'Atendimentos', value: String(openAtendimentos.length), hint: `${groups.length} cliente(s)`, tone: 'neutral' },
    ],
  }
}
