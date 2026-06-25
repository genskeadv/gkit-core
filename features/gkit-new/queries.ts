import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { requireModuleAccess } from '@/lib/auth/platform'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type {
  GkitNewCliente,
  GkitNewClienteRecord,
  GkitNewContato,
  GkitNewContatoRecord,
  GkitNewDashboardData,
  GkitNewEvento,
  GkitNewFormData,
  GkitNewGestaoData,
  GkitNewHealth,
  GkitNewListRow,
  GkitNewOportunidade,
  GkitNewOportunidadeRecord,
  GkitNewOportunidadeStatus,
  GkitNewOption,
  GkitNewTarefa,
  GkitNewTone,
  GkitNewWorkflowModelo,
  GkitNewWorkflowRecord,
} from '@/features/gkit-new/types'

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

function formatDocumento(value: unknown) {
  const digits = String(value ?? '').replace(/\D/g, '')
  if (digits.length === 14) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
  if (digits.length === 11) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
  return text(value, 'Sem documento')
}

function formatBRL(value: unknown) {
  return numberValue(value).toLocaleString('pt-BR', { currency: 'BRL', style: 'currency' })
}

function dateLabel(value: unknown) {
  const raw = text(value)
  if (!raw) return 'Sem data'
  const date = new Date(`${raw}T00:00:00`)
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

function opportunityStatus(value: unknown): GkitNewOportunidadeStatus {
  if (value === 'proposta_enviada' || value === 'em_negociacao' || value === 'aprovada' || value === 'rejeitada' || value === 'cancelada' || value === 'encerrada') return value
  return 'nova'
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    nova: 'Nova',
    proposta_enviada: 'Proposta enviada',
    em_negociacao: 'Em negociação',
    aprovada: 'Aprovada',
    rejeitada: 'Rejeitada',
    encerrada: 'Encerrada',
    pendente: 'Pendente',
    concluida: 'Concluída',
    cancelada: 'Cancelada',
    cliente_criado: 'Cliente criado',
    cliente_editado: 'Cliente editado',
    contato_criado: 'Contato criado',
    contato_editado: 'Contato editado',
    workflow_criado: 'Workflow criado',
    workflow_editado: 'Workflow editado',
    oportunidade_criada: 'Oportunidade criada',
    oportunidade_editada: 'Oportunidade editada',
    oportunidade_aprovada: 'Oportunidade aprovada',
    oportunidade_encerrada: 'Oportunidade encerrada',
    tarefa_concluida: 'Tarefa concluída',
    workflow_cancelado: 'Workflow cancelado',
  }
  return labels[status] ?? status
}

function boolLabel(value: boolean) {
  return value ? 'Ativo' : 'Inativo'
}

function tone(status: string): GkitNewTone {
  if (['ativo', 'concluida', 'aprovada'].includes(status)) return 'success'
  if (['pendente', 'prospecto', 'proposta_enviada', 'em_negociacao'].includes(status)) return 'warning'
  if (['cancelada', 'rejeitada', 'inativo', 'encerrada'].includes(status)) return 'danger'
  return 'primary'
}

function option(row: Record<string, any>, labelKey = 'nome'): GkitNewOption {
  return {
    id: String(row.id),
    label: text(row[labelKey], String(row.id)),
    meta: text(row.email ?? row.celular ?? row.status),
  }
}

function schemaHealth(error: any): GkitNewHealth | null {
  if (!error) return null

  if (error.code === 'PGRST106' || String(error.message ?? '').includes('Invalid schema: gkit_new')) {
    return {
      ok: false,
      title: 'Expor schema gkit_new no Supabase',
      message: 'O CRM novo já está cadastrado, mas o app não consegue ler os dados porque o schema gkit_new não está exposto na API.',
      detail: 'Supabase > Project Settings > API > Exposed schemas: incluir gkit_new e salvar. Depois recarregue o app.',
    }
  }

  if (error.code === '42501' || String(error.message ?? '').includes('permission denied for schema gkit_new')) {
    return {
      ok: false,
      title: 'Liberar grants do schema gkit_new',
      message: 'O schema gkit_new já está exposto, mas a API do Supabase ainda não tem permissão para consultar as tabelas.',
      detail: 'Execute sql/28_gkit_new_api_grants.sql no SQL Editor. Depois recarregue o app.',
    }
  }

  return {
    ok: false,
    title: 'Falha ao ler dados do GKIT New',
    message: text(error.message, 'O Supabase retornou erro ao consultar o schema gkit_new.'),
    detail: text(error.code, 'Verifique logs e permissões do schema.'),
  }
}

export async function getGkitNewHealth(): Promise<GkitNewHealth> {
  const { error } = await admin()
    .schema('gkit_new')
    .from('clientes')
    .select('id', { count: 'exact', head: true })

  return schemaHealth(error) ?? { ok: true }
}

function setupRow(health: GkitNewHealth): GkitNewListRow {
  return {
    id: 'gkit-new-health',
    title: health.title ?? 'Configuração pendente',
    subtitle: health.message ?? 'Existe uma pendência de configuração do GKIT New.',
    status: 'atenção',
    value: 'Supabase',
    meta: health.detail ?? 'Revise a configuração do módulo.',
    tone: 'danger',
  }
}

export async function requireGkitNewContext(target?: string) {
  const context = await requireModuleAccess('gkit-new', target)
  const hasAccess =
    canAccess(context.permissions, 'gkit_new.dashboard.read') ||
    canAccess(context.permissions, 'gkit_new.clientes.read') ||
    canAccess(context.permissions, 'gkit_new.oportunidades.read')

  if (!hasAccess) redirect('/plataforma')
  return context
}

export function canWriteGkitNew(permissions: string[], permission: string) {
  return canAccess(permissions, permission)
}

export function canSeeAllGkitNewTasks(usuarioTipo: string, permissions: string[]) {
  return canAccess(permissions, 'gkit_new.gestao.read') || ['admin_global', 'admin_carteira', 'gestor'].includes(usuarioTipo)
}

export async function getGkitNewFormData(): Promise<GkitNewFormData> {
  const supabase = admin()
  const [clientes, contatos, vinculos, oportunidades, usuarios] = await Promise.all([
    supabase.schema('gkit_new').from('clientes').select('id,nome,documento_normalizado,status').order('nome', { ascending: true }).limit(500),
    supabase.schema('gkit_new').from('contatos').select('id,nome,email,celular').order('nome', { ascending: true }).limit(500),
    supabase.schema('gkit_new').from('cliente_contatos').select('cliente_id,contato_id').limit(2000),
    supabase.schema('gkit_new').from('oportunidades').select('id,descricao,status,valor').order('criado_em', { ascending: false }).limit(500),
    supabase.schema('security').from('usuarios').select('id,nome,email,status').eq('status', 'ativo').order('nome', { ascending: true }).limit(500),
  ])

  return {
    clientes: ((clientes.data ?? []) as Array<Record<string, any>>).map((row) => ({
      id: String(row.id),
      label: text(row.nome, 'Cliente'),
      meta: `${formatDocumento(row.documento_normalizado)} - ${text(row.status, 'prospecto')}`,
    })),
    contatos: ((contatos.data ?? []) as Array<Record<string, any>>).map((row) => option(row)),
    clienteContatos: ((vinculos.data ?? []) as Array<Record<string, any>>).map((row) => ({
      cliente_id: String(row.cliente_id),
      contato_id: String(row.contato_id),
    })),
    oportunidades: ((oportunidades.data ?? []) as Array<Record<string, any>>).map((row) => ({
      id: String(row.id),
      label: text(row.descricao, 'Oportunidade'),
      meta: `${statusLabel(text(row.status, 'nova'))} - ${formatBRL(row.valor)}`,
    })),
    usuarios: ((usuarios.data ?? []) as Array<Record<string, any>>).map((row) => option(row)),
  }
}

export async function listGkitNewClientes(): Promise<GkitNewCliente[]> {
  const [clientes, vinculos, oportunidades] = await Promise.all([
    admin().schema('gkit_new').from('clientes').select('id,nome,documento_normalizado,documento_tipo,status,observacoes').order('nome', { ascending: true }).limit(500),
    admin().schema('gkit_new').from('cliente_contatos').select('cliente_id').limit(2000),
    admin().schema('gkit_new').from('oportunidades').select('cliente_id').limit(2000),
  ])

  if (clientes.error) return []

  const contatosPorCliente = ((vinculos.data ?? []) as Array<Record<string, any>>).reduce<Record<string, number>>((acc, row) => {
    const clienteId = text(row.cliente_id)
    if (clienteId) acc[clienteId] = (acc[clienteId] ?? 0) + 1
    return acc
  }, {})
  const oportunidadesPorCliente = ((oportunidades.data ?? []) as Array<Record<string, any>>).reduce<Record<string, number>>((acc, row) => {
    const clienteId = text(row.cliente_id)
    if (clienteId) acc[clienteId] = (acc[clienteId] ?? 0) + 1
    return acc
  }, {})

  return ((clientes.data ?? []) as Array<Record<string, any>>).map((row) => ({
    id: String(row.id),
    nome: text(row.nome, 'Cliente'),
    documento: formatDocumento(row.documento_normalizado),
    documento_tipo: row.documento_tipo === 'cpf' ? 'cpf' : 'cnpj',
    status: row.status === 'ativo' ? 'ativo' : 'prospecto',
    observacoes: text(row.observacoes) || null,
    contatos: contatosPorCliente[String(row.id)] ?? 0,
    oportunidades: oportunidadesPorCliente[String(row.id)] ?? 0,
  }))
}

export async function listGkitNewContatos(): Promise<GkitNewContato[]> {
  const [contatos, vinculos] = await Promise.all([
    admin().schema('gkit_new').from('contatos').select('id,nome,descricao,email,celular').order('nome', { ascending: true }).limit(500),
    admin().schema('gkit_new').from('cliente_contatos').select('contato_id').limit(2000),
  ])

  if (contatos.error) return []

  const clientesPorContato = ((vinculos.data ?? []) as Array<Record<string, any>>).reduce<Record<string, number>>((acc, row) => {
    const contatoId = text(row.contato_id)
    if (contatoId) acc[contatoId] = (acc[contatoId] ?? 0) + 1
    return acc
  }, {})

  return ((contatos.data ?? []) as Array<Record<string, any>>).map((row) => ({
    id: String(row.id),
    nome: text(row.nome, 'Contato'),
    descricao: text(row.descricao) || null,
    email: text(row.email) || null,
    celular: text(row.celular) || null,
    clientes: clientesPorContato[String(row.id)] ?? 0,
  }))
}

export async function listGkitNewWorkflowModelos(): Promise<GkitNewWorkflowModelo[]> {
  const { data, error } = await admin()
    .schema('gkit_new')
    .from('tarefa_modelos')
    .select('id,descricao,dias,responsavel_id,ativo,ordem')
    .order('ordem', { ascending: true })
    .order('criado_em', { ascending: false })
    .limit(500)

  if (error) return []
  const rows = (data ?? []) as Array<Record<string, any>>
  const responsavelIds = [...new Set(rows.map((row) => text(row.responsavel_id)).filter(Boolean))]
  const usuarios = responsavelIds.length
    ? await admin().schema('security').from('usuarios').select('id,nome,email').in('id', responsavelIds)
    : { data: [], error: null }
  const usuarioMap = new Map<string, string>(((usuarios.data ?? []) as Array<Record<string, any>>).map((row) => [String(row.id), text(row.nome, text(row.email, 'Usuário'))]))

  return rows.map((row) => ({
    id: String(row.id),
    descricao: text(row.descricao, 'Tarefa'),
    dias: numberValue(row.dias),
    responsavel_id: text(row.responsavel_id) || null,
    responsavel_nome: usuarioMap.get(text(row.responsavel_id)) ?? 'Sem responsável',
    ativo: Boolean(row.ativo),
    ordem: numberValue(row.ordem),
  }))
}

export async function listGkitNewOportunidades(): Promise<GkitNewOportunidade[]> {
  const supabase = admin()
  const [oportunidades, clientes, contatos, tarefas, usuarios] = await Promise.all([
    supabase.schema('gkit_new').from('oportunidades').select('id,cliente_id,contato_id,data,descricao,tipo,valor,escopo,status,motivo_encerramento_antecipado,responsavel_id,criado_em').order('criado_em', { ascending: false }).limit(500),
    supabase.schema('gkit_new').from('clientes').select('id,nome').limit(1000),
    supabase.schema('gkit_new').from('contatos').select('id,nome').limit(1000),
    supabase.schema('gkit_new').from('tarefas').select('oportunidade_id,status').limit(3000),
    supabase.schema('security').from('usuarios').select('id,nome,email').limit(1000),
  ])

  if (oportunidades.error) return []

  const clienteMap = new Map<string, string>(((clientes.data ?? []) as Array<Record<string, any>>).map((row) => [String(row.id), text(row.nome, 'Cliente')]))
  const contatoMap = new Map<string, string>(((contatos.data ?? []) as Array<Record<string, any>>).map((row) => [String(row.id), text(row.nome, 'Contato')]))
  const usuarioMap = new Map<string, string>(((usuarios.data ?? []) as Array<Record<string, any>>).map((row) => [String(row.id), text(row.nome, text(row.email, 'Usuário'))]))
  const tarefasPorOportunidade = ((tarefas.data ?? []) as Array<Record<string, any>>).reduce<Record<string, { pendentes: number; total: number }>>((acc, row) => {
    const oportunidadeId = text(row.oportunidade_id)
    if (!oportunidadeId) return acc
    acc[oportunidadeId] = acc[oportunidadeId] ?? { pendentes: 0, total: 0 }
    acc[oportunidadeId].total += 1
    if (row.status === 'pendente') acc[oportunidadeId].pendentes += 1
    return acc
  }, {})

  return ((oportunidades.data ?? []) as Array<Record<string, any>>).map((row) => {
    const oportunidadeId = String(row.id)
    return {
      id: oportunidadeId,
      cliente_id: String(row.cliente_id),
      cliente_nome: clienteMap.get(String(row.cliente_id)) ?? 'Cliente',
      contato_id: String(row.contato_id),
      contato_nome: contatoMap.get(String(row.contato_id)) ?? 'Contato',
      data: text(row.data),
      descricao: text(row.descricao, 'Oportunidade'),
      tipo: row.tipo === 'pontual' ? 'pontual' : 'mensal',
      valor: numberValue(row.valor),
      escopo: text(row.escopo) || null,
      status: opportunityStatus(row.status),
      motivo_encerramento_antecipado: text(row.motivo_encerramento_antecipado) || null,
      responsavel_id: text(row.responsavel_id) || null,
      responsavel_nome: usuarioMap.get(text(row.responsavel_id)) ?? 'Sem responsável',
      tarefas_pendentes: tarefasPorOportunidade[oportunidadeId]?.pendentes ?? 0,
      tarefas_total: tarefasPorOportunidade[oportunidadeId]?.total ?? 0,
    }
  })
}

export async function listGkitNewTarefas(options: {
  limit?: number
  responsavelId?: string
  status?: GkitNewTarefa['status']
} = {}): Promise<GkitNewTarefa[]> {
  const supabase = admin()
  let tarefasQuery = supabase
    .schema('gkit_new')
    .from('tarefas')
    .select('id,oportunidade_id,cliente_id,descricao,data_prevista,responsavel_id,status')
    .order('data_prevista', { ascending: true })

  if (options.status) {
    tarefasQuery = tarefasQuery.eq('status', options.status)
  }

  if (options.responsavelId) {
    tarefasQuery = tarefasQuery.eq('responsavel_id', options.responsavelId)
  }

  const [tarefas, oportunidades, clientes, usuarios] = await Promise.all([
    tarefasQuery.limit(options.limit ?? 1000),
    supabase.schema('gkit_new').from('oportunidades').select('id,descricao').limit(1000),
    supabase.schema('gkit_new').from('clientes').select('id,nome').limit(1000),
    supabase.schema('security').from('usuarios').select('id,nome,email').limit(1000),
  ])

  if (tarefas.error) return []

  const oportunidadeMap = new Map<string, string>(((oportunidades.data ?? []) as Array<Record<string, any>>).map((row) => [String(row.id), text(row.descricao, 'Oportunidade')]))
  const clienteMap = new Map<string, string>(((clientes.data ?? []) as Array<Record<string, any>>).map((row) => [String(row.id), text(row.nome, 'Cliente')]))
  const usuarioMap = new Map<string, string>(((usuarios.data ?? []) as Array<Record<string, any>>).map((row) => [String(row.id), text(row.nome, text(row.email, 'Usuário'))]))

  return ((tarefas.data ?? []) as Array<Record<string, any>>).map((row) => ({
    id: String(row.id),
    oportunidade_id: String(row.oportunidade_id),
    oportunidade_descricao: oportunidadeMap.get(String(row.oportunidade_id)) ?? 'Oportunidade',
    cliente_id: String(row.cliente_id),
    cliente_nome: clienteMap.get(String(row.cliente_id)) ?? 'Cliente',
    descricao: text(row.descricao, 'Tarefa'),
    data_prevista: text(row.data_prevista),
    responsavel_id: text(row.responsavel_id) || null,
    responsavel_nome: usuarioMap.get(text(row.responsavel_id)) ?? 'Sem responsável',
    status: row.status === 'concluida' || row.status === 'cancelada' ? row.status : 'pendente',
  }))
}

export async function listGkitNewEventos(): Promise<GkitNewEvento[]> {
  const { data, error } = await admin()
    .schema('gkit_new')
    .from('eventos')
    .select('id,entidade,entidade_id,usuario_id,tipo,descricao,criado_em')
    .order('criado_em', { ascending: false })
    .limit(80)

  if (error) return []

  const rows = (data ?? []) as Array<Record<string, any>>
  const usuarioIds = [...new Set(rows.map((row) => text(row.usuario_id)).filter(Boolean))]
  const usuarios = usuarioIds.length
    ? await admin().schema('security').from('usuarios').select('id,nome,email').in('id', usuarioIds)
    : { data: [], error: null }
  const usuarioMap = new Map<string, string>(((usuarios.data ?? []) as Array<Record<string, any>>).map((row) => [String(row.id), text(row.nome, text(row.email, 'Usuário'))]))

  return rows.map((row) => ({
    id: String(row.id),
    entidade: text(row.entidade, 'registro'),
    entidade_id: String(row.entidade_id),
    usuario_id: text(row.usuario_id) || null,
    usuario_nome: usuarioMap.get(text(row.usuario_id)) ?? 'Sistema',
    tipo: text(row.tipo, 'evento'),
    descricao: text(row.descricao, 'Evento registrado.'),
    criado_em: text(row.criado_em),
  }))
}

export function clienteRows(clientes: GkitNewCliente[]): GkitNewListRow[] {
  return clientes.map((cliente) => ({
    id: cliente.id,
    title: cliente.nome,
    subtitle: `${formatDocumento(cliente.documento)} - ${cliente.documento_tipo.toUpperCase()}`,
    status: cliente.status === 'ativo' ? 'Ativo' : 'Prospecto',
    value: `${cliente.contatos} contato(s)`,
    meta: `${cliente.oportunidades} oportunidade(s)`,
    detailHref: `/modulos/gkit-new/clientes/${cliente.id}`,
    tone: tone(cliente.status),
  }))
}

export function contatoRows(contatos: GkitNewContato[]): GkitNewListRow[] {
  return contatos.map((contato) => ({
    id: contato.id,
    title: contato.nome,
    subtitle: contato.email || contato.celular || 'Sem contato principal',
    status: 'Contato',
    value: `${contato.clientes} cliente(s)`,
    meta: contato.descricao || 'Relacionamento comercial',
    detailHref: `/modulos/gkit-new/contatos/${contato.id}`,
    tone: 'primary',
  }))
}

export function workflowRows(modelos: GkitNewWorkflowModelo[]): GkitNewListRow[] {
  return modelos.map((modelo) => ({
    id: modelo.id,
    title: modelo.descricao,
    subtitle: `${modelo.dias} dia(s) após criação da oportunidade`,
    status: boolLabel(modelo.ativo),
    value: modelo.responsavel_nome,
    meta: `ordem ${modelo.ordem}`,
    detailHref: `/modulos/gkit-new/base/workflow/${modelo.id}`,
    tone: modelo.ativo ? 'success' : 'danger',
  }))
}

export function oportunidadeRows(oportunidades: GkitNewOportunidade[]): GkitNewListRow[] {
  return oportunidades.map((oportunidade) => ({
    id: oportunidade.id,
    title: oportunidade.descricao,
    subtitle: `${oportunidade.cliente_nome} - ${oportunidade.contato_nome} - ${dateLabel(oportunidade.data)}`,
    status: statusLabel(oportunidade.status),
    value: formatBRL(oportunidade.valor),
    meta: `${oportunidade.tarefas_pendentes}/${oportunidade.tarefas_total} tarefa(s) pendente(s)`,
    detailHref: `/modulos/gkit-new/oportunidades/${oportunidade.id}`,
    tone: tone(oportunidade.status),
  }))
}

export function tarefaRows(tarefas: GkitNewTarefa[]): GkitNewListRow[] {
  return tarefas.map((tarefa) => ({
    id: tarefa.id,
    title: tarefa.descricao,
    subtitle: `${tarefa.cliente_nome} - ${tarefa.oportunidade_descricao}`,
    status: statusLabel(tarefa.status),
    value: dateLabel(tarefa.data_prevista),
    meta: tarefa.responsavel_nome,
    detailHref: `/modulos/gkit-new/tarefas/${tarefa.id}`,
    tone: tone(tarefa.status),
  }))
}

export function eventoRows(eventos: GkitNewEvento[]): GkitNewListRow[] {
  return eventos.map((evento) => ({
    id: evento.id,
    title: statusLabel(evento.tipo),
    subtitle: evento.descricao,
    status: evento.entidade,
    value: evento.usuario_nome,
    meta: dateTimeLabel(evento.criado_em),
    tone: evento.tipo.includes('aprovada') || evento.tipo.includes('concluida') ? 'success' : evento.tipo.includes('cancelado') || evento.tipo.includes('encerrada') ? 'danger' : 'primary',
  }))
}

export async function getGkitNewDashboardData(): Promise<GkitNewDashboardData> {
  const [health, clientes, contatos, modelos, oportunidades, tarefas] = await Promise.all([
    getGkitNewHealth(),
    listGkitNewClientes(),
    listGkitNewContatos(),
    listGkitNewWorkflowModelos(),
    listGkitNewOportunidades(),
    listGkitNewTarefas(),
  ])

  const ativos = clientes.filter((cliente) => cliente.status === 'ativo').length
  const today = new Date().toISOString().slice(0, 10)
  const tarefasPendentes = tarefas.filter((tarefa) => tarefa.status === 'pendente')
  const tarefasVencidas = tarefasPendentes.filter((tarefa) => tarefa.data_prevista < today)
  const tarefasHoje = tarefasPendentes.filter((tarefa) => tarefa.data_prevista === today)
  const readiness: GkitNewListRow[] = [
    health.ok ? null : setupRow(health),
    clientes.length ? null : {
      id: 'clientes',
      title: 'Cadastrar clientes',
      subtitle: 'A base comercial ainda não tem clientes.',
      status: 'pendente',
      value: 'Base cadastral',
      meta: 'Sprint 1',
      detailHref: '/modulos/gkit-new/clientes/novo',
      tone: 'warning',
    },
    contatos.length ? null : {
      id: 'contatos',
      title: 'Cadastrar contatos',
      subtitle: 'Crie contatos e vincule aos clientes.',
      status: 'pendente',
      value: 'Base cadastral',
      meta: 'Sprint 1',
      detailHref: '/modulos/gkit-new/contatos/novo',
      tone: 'warning',
    },
    modelos.length ? null : {
      id: 'workflow',
      title: 'Configurar workflow',
      subtitle: 'Modelos ativos gerarão tarefas nas oportunidades.',
      status: 'pendente',
      value: 'Workflow',
      meta: 'Sprint 1',
      detailHref: '/modulos/gkit-new/base/workflow/novo',
      tone: 'warning',
    },
  ].filter(Boolean) as GkitNewListRow[]

  return {
    cards: [
      { label: 'Clientes', value: String(clientes.length), hint: 'base cadastrada' },
      { label: 'Prospectos', value: String(clientes.length - ativos), hint: 'sem oportunidade aprovada' },
      { label: 'Ativos', value: String(ativos), hint: 'com oportunidade aprovada' },
      { label: 'Oportunidades', value: String(oportunidades.length), hint: 'negociacoes cadastradas' },
      { label: 'Tarefas', value: String(tarefasPendentes.length), hint: `${tarefasVencidas.length} vencida(s), ${tarefasHoje.length} hoje` },
    ],
    tarefas: tarefaRows(tarefasPendentes.slice(0, 8)),
    readiness,
    health,
  }
}

export async function getGkitNewGestaoData(): Promise<GkitNewGestaoData> {
  const [health, clientes, oportunidades, tarefas, eventos] = await Promise.all([
    getGkitNewHealth(),
    listGkitNewClientes(),
    listGkitNewOportunidades(),
    listGkitNewTarefas(),
    listGkitNewEventos(),
  ])

  const ativos = clientes.filter((cliente) => cliente.status === 'ativo').length
  const abertas = oportunidades.filter((oportunidade) => !['encerrada', 'rejeitada', 'cancelada'].includes(oportunidade.status))
  const aprovadas = oportunidades.filter((oportunidade) => oportunidade.status === 'aprovada')
  const pipeline = abertas.reduce((total, oportunidade) => total + oportunidade.valor, 0)
  const aprovado = aprovadas.reduce((total, oportunidade) => total + oportunidade.valor, 0)
  const conversao = oportunidades.length ? Math.round((aprovadas.length / oportunidades.length) * 100) : 0
  const pendentes = tarefas.filter((tarefa) => tarefa.status === 'pendente').length

  const statusOrder: GkitNewOportunidadeStatus[] = ['nova', 'proposta_enviada', 'em_negociacao', 'aprovada', 'rejeitada', 'cancelada', 'encerrada']
  const oportunidadesPorStatus = statusOrder.map((status) => {
    const rows = oportunidades.filter((oportunidade) => oportunidade.status === status)
    return {
      id: status,
      title: statusLabel(status),
      subtitle: `${rows.length} oportunidade(s)`,
      status: statusLabel(status),
      value: formatBRL(rows.reduce((total, oportunidade) => total + oportunidade.valor, 0)),
      meta: rows.length ? `${Math.round((rows.length / oportunidades.length) * 100)}% do total` : 'Sem oportunidades',
      tone: tone(status),
    }
  })

  const produtividadeMap = oportunidades.reduce<Record<string, { nome: string; total: number; aprovadas: number; valor: number }>>((acc, oportunidade) => {
    const key = oportunidade.responsavel_id ?? 'sem-responsavel'
    acc[key] = acc[key] ?? { nome: oportunidade.responsavel_nome, total: 0, aprovadas: 0, valor: 0 }
    acc[key].total += 1
    if (oportunidade.status === 'aprovada') {
      acc[key].aprovadas += 1
      acc[key].valor += oportunidade.valor
    }
    return acc
  }, {})

  const produtividade = Object.entries(produtividadeMap)
    .sort(([, a], [, b]) => b.valor - a.valor)
    .map(([id, item]) => ({
      id,
      title: item.nome,
      subtitle: `${item.total} oportunidade(s) acompanhada(s)`,
      status: `${item.aprovadas} aprovada(s)`,
      value: formatBRL(item.valor),
      meta: item.total ? `${Math.round((item.aprovadas / item.total) * 100)}% conversão` : 'Sem conversão',
      tone: item.aprovadas ? 'success' as const : 'primary' as const,
    }))

  return {
    cards: [
      { label: 'Clientes', value: String(clientes.length), hint: `${clientes.length - ativos} prospecto(s)` },
      { label: 'Ativos', value: String(ativos), hint: 'com oportunidade aprovada' },
      { label: 'Pipeline', value: formatBRL(pipeline), hint: 'oportunidades não encerradas' },
      { label: 'Aprovado', value: formatBRL(aprovado), hint: `${conversao}% de conversão` },
      { label: 'Tarefas', value: String(pendentes), hint: 'pendentes no workflow' },
    ],
    oportunidadesPorStatus,
    produtividade: health.ok ? produtividade : [setupRow(health)],
    eventos: health.ok ? eventoRows(eventos.slice(0, 12)) : [],
    health,
  }
}

export async function getGkitNewCliente(id: string): Promise<GkitNewClienteRecord> {
  const { data, error } = await admin()
    .schema('gkit_new')
    .from('clientes')
    .select('id,nome,documento_normalizado,documento_tipo,status,observacoes')
    .eq('id', id)
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Cliente não encontrado.')
  const row = data as Record<string, any>

  return {
    id: String(row.id),
    nome: text(row.nome),
    documento: formatDocumento(row.documento_normalizado),
    documento_tipo: row.documento_tipo === 'cpf' ? 'cpf' : 'cnpj',
    status: row.status === 'ativo' ? 'ativo' : 'prospecto',
    observacoes: text(row.observacoes) || null,
  }
}

export async function getGkitNewContato(id: string): Promise<GkitNewContatoRecord> {
  const [contato, vinculos] = await Promise.all([
    admin().schema('gkit_new').from('contatos').select('id,nome,descricao,email,celular').eq('id', id).single(),
    admin().schema('gkit_new').from('cliente_contatos').select('cliente_id').eq('contato_id', id),
  ])

  if (contato.error || !contato.data) throw new Error(contato.error?.message ?? 'Contato não encontrado.')

  const row = contato.data as Record<string, any>
  return {
    id: String(row.id),
    nome: text(row.nome),
    descricao: text(row.descricao) || null,
    email: text(row.email) || null,
    celular: text(row.celular) || null,
    cliente_ids: ((vinculos.data ?? []) as Array<Record<string, any>>).map((vinculo) => String(vinculo.cliente_id)),
  }
}

export async function getGkitNewWorkflowModelo(id: string): Promise<GkitNewWorkflowRecord> {
  const { data, error } = await admin()
    .schema('gkit_new')
    .from('tarefa_modelos')
    .select('id,descricao,dias,responsavel_id,ativo,ordem')
    .eq('id', id)
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Modelo de workflow não encontrado.')
  const row = data as Record<string, any>

  return {
    id: String(row.id),
    descricao: text(row.descricao),
    dias: numberValue(row.dias),
    responsavel_id: text(row.responsavel_id) || null,
    ativo: Boolean(row.ativo),
    ordem: numberValue(row.ordem),
  }
}

export async function getGkitNewOportunidade(id: string): Promise<GkitNewOportunidadeRecord> {
  const { data, error } = await admin()
    .schema('gkit_new')
    .from('oportunidades')
    .select('id,cliente_id,contato_id,data,descricao,tipo,valor,escopo,status,motivo_encerramento_antecipado,responsavel_id')
    .eq('id', id)
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Oportunidade não encontrada.')
  const row = data as Record<string, any>

  return {
    id: String(row.id),
    cliente_id: String(row.cliente_id),
    contato_id: String(row.contato_id),
    data: text(row.data),
    descricao: text(row.descricao),
    tipo: row.tipo === 'pontual' ? 'pontual' : 'mensal',
    valor: numberValue(row.valor),
    escopo: text(row.escopo) || null,
    status: opportunityStatus(row.status),
    motivo_encerramento_antecipado: text(row.motivo_encerramento_antecipado) || null,
    responsavel_id: text(row.responsavel_id) || null,
  }
}

export async function getGkitNewTarefa(id: string): Promise<GkitNewTarefa> {
  const tarefas = await listGkitNewTarefas()
  const tarefa = tarefas.find((item) => item.id === id)
  if (!tarefa) throw new Error('Tarefa não encontrada.')
  return tarefa
}
