import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { requireModuleAccess, type PlatformUsuario } from '@/lib/auth/platform'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type {
  GkitFatContrato,
  GkitFatContratoStatus,
  GkitFatDashboardData,
  GkitFatFormData,
  GkitFatHealth,
  GkitFatOption,
  GkitFatOrdemServico,
  GkitFatTipoCliente,
  GkitFatTipoPessoa,
} from '@/features/gkit-fat/types'

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

function integerValue(value: unknown) {
  const parsed = Number(value ?? 0)
  return Number.isInteger(parsed) ? parsed : Math.trunc(numberValue(value))
}

function formatBRL(value: unknown) {
  const parsed = numberValue(value)
  return parsed.toLocaleString('pt-BR', { currency: 'BRL', style: 'currency' })
}

function labelDate(value: unknown) {
  const raw = text(value)
  if (!raw) return null
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return raw
  return new Intl.DateTimeFormat('pt-BR').format(date)
}

export function tipoCliente(value: unknown): GkitFatTipoCliente {
  if (value === 'pontual' || value === 'cobranca') return value
  return 'mensal'
}

export function tipoPessoa(value: unknown): GkitFatTipoPessoa {
  if (value === 'pessoa_fisica' || value === 'pessoa_juridica') return value
  return 'condominio'
}

export function contratoStatus(value: unknown): GkitFatContratoStatus {
  if (value === 'ativo' || value === 'suspenso' || value === 'cancelado' || value === 'encerrado') return value
  return 'em_elaboracao'
}

export function statusLabel(value: string) {
  const labels: Record<string, string> = {
    em_elaboracao: 'Em elaboracao',
    ativo: 'Ativo',
    suspenso: 'Suspenso',
    cancelado: 'Cancelado',
    encerrado: 'Encerrado',
    rascunho: 'Rascunho',
    em_conferencia: 'Em conferencia',
    pronta_para_faturar: 'Pronta',
    faturada: 'Faturada',
    nao_configurada: 'Nao configurada',
    nao_enviada: 'Nao enviada',
    validando: 'Validando',
    autorizada: 'Autorizada',
    rejeitada: 'Rejeitada',
    manual_pendente: 'Manual pendente',
    nao_gerar_financeiro: 'Nao gerar',
    aguardando_fiscal: 'Aguardando fiscal',
    prevista: 'Prevista',
    gerada: 'Gerada',
    parcialmente_recebida: 'Parcial',
    recebida: 'Recebida',
  }
  return labels[value] ?? value
}

export function tone(value: string) {
  if (['ativo', 'autorizada', 'faturada', 'gerada', 'recebida'].includes(value)) return 'success'
  if (['suspenso', 'em_elaboracao', 'rascunho', 'em_conferencia', 'pronta_para_faturar', 'validando', 'prevista'].includes(value)) return 'warning'
  if (['cancelado', 'encerrado', 'rejeitada', 'cancelada'].includes(value)) return 'danger'
  return 'primary'
}

function schemaHealth(error: any): GkitFatHealth | null {
  if (!error) return null

  if (error.code === 'PGRST106' || String(error.message ?? '').includes('Invalid schema: gkit_fat')) {
    return {
      ok: false,
      title: 'Expor schema gkit_fat no Supabase',
      message: 'O modulo FAT ja tem codigo, mas o schema gkit_fat ainda nao esta visivel para a API.',
      detail: 'Supabase > Project Settings > API > Exposed schemas: adicionar gkit_fat. Depois recarregue o app.',
    }
  }

  return {
    ok: false,
    title: 'Falha ao ler dados do GKIT FAT',
    message: text(error.message, 'O Supabase retornou erro ao consultar o modulo.'),
    detail: text(error.code, 'Verifique logs e configuracao do schema.'),
  }
}

export async function getGkitFatHealth(): Promise<GkitFatHealth> {
  const { error } = await admin()
    .schema('gkit_fat')
    .from('contratos_servico')
    .select('id', { count: 'exact', head: true })

  return schemaHealth(error) ?? { ok: true }
}

export async function requireGkitFatContext(target = '/modulos/gkit-fat') {
  const context = await requireModuleAccess('gkit-fat', target)
  const hasAccess =
    canAccess(context.permissions, 'gkit_fat.dashboard.read') ||
    canAccess(context.permissions, 'gkit_fat.contratos.read') ||
    canAccess(context.permissions, 'gkit_fat.faturas.read')

  if (!hasAccess) redirect('/plataforma')
  return context
}

export function canWriteGkitFat(permissions: string[], permission: string) {
  return canAccess(permissions, permission)
}

async function allowedCarteiras(usuario: PlatformUsuario) {
  if (usuario.tipo === 'admin_global') return null

  const { data, error } = await admin()
    .schema('security')
    .from('usuario_carteiras')
    .select('carteira_id')
    .eq('usuario_id', usuario.id)
    .eq('ativo', true)

  if (error) return new Set<string>()
  return new Set<string>((data ?? []).map((row: any) => text(row.carteira_id)).filter(Boolean))
}

function filterRowsByCarteira<T extends Record<string, any>>(rows: T[], scope: Set<string> | null) {
  if (scope === null) return rows
  return rows.filter((row) => !text(row.carteira_id) || scope.has(text(row.carteira_id)))
}

async function mapClientes(ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))]
  if (!unique.length) return new Map<string, Record<string, any>>()

  const { data } = await admin()
    .schema('ciclo')
    .from('clientes')
    .select('id,nome,nome_fantasia,razao_social,documento,carteira_id,tipo_cliente,tipo_pessoa')
    .in('id', unique)

  return new Map<string, Record<string, any>>(((data ?? []) as Array<Record<string, any>>).map((row) => [String(row.id), row]))
}

async function mapCarteiras(ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))]
  if (!unique.length) return new Map<string, string>()

  const { data } = await admin()
    .schema('core')
    .from('carteiras')
    .select('id,nome')
    .in('id', unique)

  return new Map<string, string>(((data ?? []) as Array<Record<string, any>>).map((row) => [String(row.id), text(row.nome)]))
}

function clienteNome(row: Record<string, any> | undefined) {
  if (!row) return 'Cliente nao informado'
  return text(row.nome) || text(row.nome_fantasia) || text(row.razao_social) || 'Cliente sem nome'
}

function mapContrato(row: Record<string, any>, clientes: Map<string, Record<string, any>>, carteiras: Map<string, string>): GkitFatContrato {
  const cliente = clientes.get(text(row.cliente_id))
  const carteiraId = text(row.carteira_id) || text(cliente?.carteira_id) || null
  return {
    id: String(row.id),
    numero: text(row.numero),
    cliente_id: text(row.cliente_id),
    cliente_nome: clienteNome(cliente),
    cliente_documento: text(cliente?.documento) || null,
    cliente_tipo: tipoCliente(cliente?.tipo_cliente ?? row.tipo_faturamento),
    cliente_tipo_pessoa: tipoPessoa(cliente?.tipo_pessoa),
    carteira_id: carteiraId,
    carteira_nome: carteiraId ? carteiras.get(carteiraId) ?? null : null,
    tipo_faturamento: tipoCliente(row.tipo_faturamento),
    periodicidade_meses: Math.max(integerValue(row.periodicidade_meses), 1),
    dia_faturamento: row.dia_faturamento === null ? null : integerValue(row.dia_faturamento),
    dia_vencimento: row.dia_vencimento === null ? null : integerValue(row.dia_vencimento),
    inicio_vigencia: text(row.inicio_vigencia) || null,
    fim_vigencia: text(row.fim_vigencia) || null,
    valor_padrao: numberValue(row.valor_padrao),
    valor_label: formatBRL(row.valor_padrao),
    descricao_servico: text(row.descricao_servico, 'Servicos advocaticios'),
    iss_retido: Boolean(row.iss_retido),
    gerar_financeiro: row.gerar_financeiro !== false,
    status: contratoStatus(row.status),
    observacoes: text(row.observacoes) || null,
    atualizado_em: labelDate(row.atualizado_em),
  }
}

function mapOrdem(
  row: Record<string, any>,
  clientes: Map<string, Record<string, any>>,
  carteiras: Map<string, string>,
  contratos: Map<string, string>,
): GkitFatOrdemServico {
  const cliente = clientes.get(text(row.cliente_id))
  const carteiraId = text(row.carteira_id) || text(cliente?.carteira_id) || null
  return {
    id: String(row.id),
    numero: text(row.numero),
    contrato_id: text(row.contrato_id) || null,
    contrato_numero: contratos.get(text(row.contrato_id)) ?? null,
    cliente_id: text(row.cliente_id),
    cliente_nome: clienteNome(cliente),
    carteira_nome: carteiraId ? carteiras.get(carteiraId) ?? null : null,
    origem: text(row.origem, 'manual'),
    competencia: labelDate(row.competencia),
    data_vencimento: labelDate(row.data_vencimento),
    descricao_servico: text(row.descricao_servico, 'Servicos advocaticios'),
    valor_total: numberValue(row.valor_total),
    valor_label: formatBRL(row.valor_total),
    situacao_operacional: text(row.situacao_operacional, 'rascunho'),
    situacao_fiscal: text(row.situacao_fiscal, 'nao_enviada'),
    situacao_financeira: text(row.situacao_financeira, 'prevista'),
    atualizado_em: labelDate(row.atualizado_em),
  }
}

export async function listGkitFatContratos(usuario: PlatformUsuario, limit = 500) {
  const scope = await allowedCarteiras(usuario)
  const { data, error } = await admin()
    .schema('gkit_fat')
    .from('contratos_servico')
    .select('*')
    .order('atualizado_em', { ascending: false })
    .limit(limit)

  if (error) return []
  const rows = filterRowsByCarteira((data ?? []) as Array<Record<string, any>>, scope)
  const clientes = await mapClientes(rows.flatMap((row) => [text(row.cliente_id), text(row.tomador_id)]))
  const carteiras = await mapCarteiras(rows.flatMap((row) => [text(row.carteira_id), text(clientes.get(text(row.cliente_id))?.carteira_id)]))
  return rows.map((row) => mapContrato(row, clientes, carteiras))
}

export async function getGkitFatContrato(usuario: PlatformUsuario, id: string) {
  const { data, error } = await admin()
    .schema('gkit_fat')
    .from('contratos_servico')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return null
  const scope = await allowedCarteiras(usuario)
  const rows = filterRowsByCarteira([data as Record<string, any>], scope)
  if (!rows.length) return null
  const clientes = await mapClientes([text(data.cliente_id), text(data.tomador_id)])
  const carteiras = await mapCarteiras([text(data.carteira_id), text(clientes.get(text(data.cliente_id))?.carteira_id)])
  return mapContrato(data as Record<string, any>, clientes, carteiras)
}

export async function listGkitFatOrdens(usuario: PlatformUsuario, limit = 500) {
  const scope = await allowedCarteiras(usuario)
  const { data, error } = await admin()
    .schema('gkit_fat')
    .from('ordens_servico')
    .select('*')
    .order('criado_em', { ascending: false })
    .limit(limit)

  if (error) return []
  const rows = filterRowsByCarteira((data ?? []) as Array<Record<string, any>>, scope)
  const clientes = await mapClientes(rows.flatMap((row) => [text(row.cliente_id), text(row.tomador_id)]))
  const carteiras = await mapCarteiras(rows.flatMap((row) => [text(row.carteira_id), text(clientes.get(text(row.cliente_id))?.carteira_id)]))
  const contratoIds = [...new Set(rows.map((row) => text(row.contrato_id)).filter(Boolean))]
  const contratosResult = contratoIds.length
    ? await admin().schema('gkit_fat').from('contratos_servico').select('id,numero').in('id', contratoIds)
    : { data: [] }
  const contratos = new Map<string, string>(((contratosResult.data ?? []) as Array<Record<string, any>>).map((row) => [String(row.id), text(row.numero)]))
  return rows.map((row) => mapOrdem(row, clientes, carteiras, contratos))
}

export async function getGkitFatFormData(usuario: PlatformUsuario): Promise<GkitFatFormData> {
  const scope = await allowedCarteiras(usuario)
  const [clientesResult, carteirasResult, contratosResult] = await Promise.all([
    admin()
      .schema('ciclo')
      .from('clientes')
      .select('id,nome,nome_fantasia,razao_social,documento,carteira_id,tipo_cliente,tipo_pessoa,ativo')
      .eq('ativo', true)
      .order('nome', { ascending: true })
      .limit(1000),
    scope === null
      ? admin().schema('core').from('carteiras').select('id,nome').eq('status', 'ativo').order('nome', { ascending: true }).limit(500)
      : scope.size
        ? admin().schema('core').from('carteiras').select('id,nome').in('id', [...scope]).eq('status', 'ativo').order('nome', { ascending: true }).limit(500)
        : { data: [] },
    admin().schema('gkit_fat').from('contratos_servico').select('id,numero,cliente_id,carteira_id,status').order('numero', { ascending: true }).limit(1000),
  ])

  const clienteRows = filterRowsByCarteira((clientesResult.data ?? []) as Array<Record<string, any>>, scope)
  const clienteMap = new Map<string, Record<string, any>>(clienteRows.map((row) => [String(row.id), row]))
  const contratoRows = filterRowsByCarteira((contratosResult.data ?? []) as Array<Record<string, any>>, scope)

  return {
    clientes: clienteRows.map((row) => ({
      id: String(row.id),
      label: clienteNome(row),
      meta: [text(row.documento), tipoCliente(row.tipo_cliente), tipoPessoa(row.tipo_pessoa)].filter(Boolean).join(' - '),
      carteira_id: text(row.carteira_id) || null,
      tipo_cliente: tipoCliente(row.tipo_cliente),
      tipo_pessoa: tipoPessoa(row.tipo_pessoa),
    })),
    carteiras: ((carteirasResult.data ?? []) as Array<Record<string, any>>).map((row) => ({
      id: String(row.id),
      label: text(row.nome),
    })),
    contratos: contratoRows.map((row) => {
      const cliente = clienteMap.get(text(row.cliente_id))
      return {
        id: String(row.id),
        label: `${text(row.numero)} - ${clienteNome(cliente)}`,
        meta: statusLabel(text(row.status)),
        carteira_id: text(row.carteira_id) || null,
      }
    }),
  }
}

export async function getGkitFatDashboard(usuario: PlatformUsuario): Promise<GkitFatDashboardData> {
  const [contratos, ordens] = await Promise.all([
    listGkitFatContratos(usuario, 200),
    listGkitFatOrdens(usuario, 200),
  ])

  const valorMensal = contratos
    .filter((item) => item.status === 'ativo' && item.tipo_faturamento === 'mensal')
    .reduce((sum, item) => sum + item.valor_padrao, 0)
  const abertas = ordens.filter((item) => item.situacao_operacional !== 'faturada' && item.situacao_operacional !== 'cancelada')
  const rejeitadas = ordens.filter((item) => item.situacao_fiscal === 'rejeitada')

  return {
    cards: [
      { label: 'Contratos ativos', value: String(contratos.filter((item) => item.status === 'ativo').length), hint: `${contratos.length} contratos no modulo` },
      { label: 'MRR 03220', value: formatBRL(valorMensal), hint: 'Base mensal ativa de advocacia' },
      { label: 'OS abertas', value: String(abertas.length), hint: 'Ainda nao faturadas/canceladas' },
      { label: 'Pendencias fiscais', value: String(rejeitadas.length), hint: 'OS rejeitadas para correcao' },
    ],
    quickLinks: [
      { href: '/modulos/gkit-fat/contratos/novo', title: 'Novo contrato', description: 'Criar contrato mensal, pontual ou cobranca para cliente do Ciclo.', label: 'Contratos' },
      { href: '/modulos/gkit-fat/faturas', title: 'Preparar OS', description: 'Gerar ordem de servico com snapshot para NFS-e 03220.', label: 'Faturamento' },
      { href: '/modulos/ciclo/clientes', title: 'Cadastro do cliente', description: 'Ajustar categoria e natureza do tomador no cadastro mestre.', label: 'Ciclo' },
    ],
    contratosRecentes: contratos.slice(0, 8),
    ordensRecentes: ordens.slice(0, 8),
  }
}
