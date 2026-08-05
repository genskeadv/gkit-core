import { requireModuleAccess } from '@/lib/auth/platform'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type {
  ColabBenefit,
  ColabCollaborator,
  ColabCommission,
  ColabData,
  ColabPayment,
  ColabUberData,
  ColabUberExpense,
} from '@/features/colab/types'

function admin() {
  return createSupabaseAdminClient() as any
}

function text(value: unknown, fallback = '') {
  if (value === null || value === undefined || value === '') return fallback
  return String(value)
}

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function dateValue(...values: unknown[]) {
  return text(values.find(Boolean), new Date().toISOString())
}

function competenceLabel(value: unknown) {
  if (!value) return 'Sem competência'
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'UTC', year: 'numeric' }).format(date)
}

function mapCollaborator(row: Record<string, unknown>): ColabCollaborator {
  return {
    id: text(row.id),
    name: text(row.nome, 'Colaborador'),
    email: text(row.email),
    phone: text(row.telefone, 'Não informado'),
    role: text(row.cargo, 'Colaborador'),
    department: text(row.time_nome, 'Sem time'),
    manager: text(row.gestor_nome, 'Sem gestor'),
    status: text(row.status, 'ativo'),
    admissionDate: dateValue(row.data_admissao, row.admissao_em, row.criado_em),
  }
}

function mapGkitFlexPayment(row: Record<string, unknown>): ColabPayment {
  const amount = numberValue(row.valor_previsto)
  const paid = Boolean(row.pago)

  return {
    id: text(row.id),
    type: text(row.origem_tipo, 'Pagamento'),
    description: text(row.descricao, 'Pagamento GKIT Flex'),
    competence: competenceLabel(row.competencia),
    grossAmount: amount,
    discountAmount: 0,
    netAmount: amount,
    status: paid ? 'pago' : 'previsto',
    paymentDate: dateValue(row.updated_at, row.created_at, row.competencia),
    commissionId: text(row.origem_resumo_id) || null,
  }
}

function mapGkitFlexCommission(
  row: Record<string, unknown>,
  executionsById: Map<string, Record<string, unknown>>,
  paidSummaryIds: Set<string>,
): ColabCommission {
  const execution = executionsById.get(text(row.execucao_id))
  const summaryId = text(row.id)
  const paid = paidSummaryIds.has(summaryId)

  return {
    id: summaryId,
    reference: competenceLabel(execution?.competencia ?? row.created_at),
    origin: text(row.carteira, 'Carteira'),
    client: text(row.carteira, 'Carteira'),
    category: text(row.categoria, 'Sem categoria'),
    baseAmount: numberValue(row.valor_apos_reducao || row.valor_recebido),
    percentage: numberValue(row.percentual_comissao),
    amount: numberValue(row.comissao_final),
    status: paid ? 'paga' : text(execution?.status, 'calculada'),
    createdAt: dateValue(row.created_at, execution?.created_at),
    paidAt: paid ? dateValue(row.updated_at, execution?.created_at) : null,
  }
}

function emptyData(databaseReady: boolean, message: string): ColabData {
  return {
    collaborator: null,
    payments: [],
    commissions: [],
    benefits: [],
    uber: [],
    databaseReady,
    source: {
      label: 'GKIT Intr',
      status: databaseReady ? 'pendente' : 'erro',
      message,
    },
    summary: {
      latestPayment: 0,
      openCommissions: 0,
      approvedCommissions: 0,
      paidCommissions: 0,
      pendingPayments: 0,
      pendingUberExpenses: 0,
    },
  }
}

function buildSummary(payments: ColabPayment[], commissions: ColabCommission[], uber: ColabUberExpense[] = []): ColabData['summary'] {
  const openCommissions = commissions
    .filter((item) => !['paga', 'cancelada', 'rejeitada'].includes(item.status))
    .reduce((sum, item) => sum + item.amount, 0)
  const approvedCommissions = commissions
    .filter((item) => item.status === 'aprovada')
    .reduce((sum, item) => sum + item.amount, 0)
  const paidCommissions = commissions
    .filter((item) => item.status === 'paga')
    .reduce((sum, item) => sum + item.amount, 0)

  return {
    latestPayment: payments[0]?.netAmount ?? 0,
    openCommissions,
    approvedCommissions,
    paidCommissions,
    pendingPayments: payments.filter((item) => item.status !== 'pago' && item.status !== 'cancelado').length,
    pendingUberExpenses: uber.filter((item) => !['conciliado', 'reembolsado', 'rejeitado'].includes(item.status)).length,
  }
}

function buildBenefits(collaborator: ColabCollaborator, row?: Record<string, unknown>): ColabBenefit[] {
  const description = text(row?.beneficio_descricao ?? row?.beneficios_descricao)
  const value = numberValue(row?.beneficio_valor ?? row?.total_beneficios ?? row?.beneficios)
  const provider = text(row?.fonte_label, 'GKIT Flex')

  if (!description && value <= 0) return []

  return [
    {
      id: `${collaborator.id}-beneficio-principal`,
      name: description || 'Beneficio cadastrado',
      description: description || `Beneficio sincronizado do cadastro do ${provider}.`,
      status: 'ativo',
      provider,
      monthlyValue: value,
    },
  ]
}

export async function requireColabContext() {
  return requireModuleAccess('colab')
}

export async function getGkitFlexProfileByEmail(normalizedEmail: string) {
  const usuarioResult = await admin()
    .schema('security')
    .from('usuarios')
    .select('id,nome,email,status')
    .ilike('email', normalizedEmail)
    .maybeSingle()

  if (usuarioResult.error || !usuarioResult.data) {
    return { data: null, error: usuarioResult.error }
  }

  const colaboradorResult = await admin()
    .from('gkit_flex_colaboradores')
    .select('*')
    .eq('usuario_id', usuarioResult.data.id)
    .maybeSingle()

  if (colaboradorResult.error || !colaboradorResult.data) {
    return { data: null, error: colaboradorResult.error }
  }

  const row = colaboradorResult.data as Record<string, unknown>
  const [carteiraResult, gestorResult] = await Promise.all([
    row.carteira_id
      ? admin().schema('core').from('carteiras').select('id,nome').eq('id', row.carteira_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    row.gestor_usuario_id
      ? admin().schema('security').from('usuarios').select('id,nome,email').eq('id', row.gestor_usuario_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])

  return {
    data: {
      ...row,
      nome: usuarioResult.data.nome,
      email: usuarioResult.data.email,
      telefone: row.telefone,
      cargo: row.cargo_operacional,
      time_nome: text(carteiraResult.data?.nome, 'Sem carteira'),
      gestor_nome: text(gestorResult.data?.nome, 'Sem gestor'),
      data_admissao: row.data_inicio,
      fonte_label: 'GKIT Flex',
    },
    error: null,
  }
}

function mapUberExpense(row: Record<string, unknown>, signedUrl?: string | null): ColabUberExpense {
  return {
    id: text(row.id),
    client: text(row.cliente_nome_snapshot, 'Cliente'),
    description: text(row.descricao, 'Despesa Uber'),
    date: dateValue(row.data_despesa),
    competence: competenceLabel(row.competencia),
    amount: numberValue(row.valor),
    status: text(row.status, 'lancado'),
    receiptName: text(row.recibo_nome, 'Recibo'),
    receiptUrl: signedUrl || null,
    createdAt: dateValue(row.created_at),
  }
}

async function listUberExpensesForUser(usuarioId: string): Promise<ColabUberExpense[]> {
  const { data, error } = await admin()
    .from('colab_uber_despesas')
    .select('id, cliente_nome_snapshot, data_despesa, competencia, descricao, valor, recibo_bucket, recibo_path, recibo_nome, status, created_at')
    .eq('colaborador_usuario_id', usuarioId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return []

  const rows = (data ?? []) as Array<Record<string, unknown>>
  return Promise.all(rows.map(async (row) => {
    const bucket = text(row.recibo_bucket, 'colab-uber-recibos')
    const path = text(row.recibo_path)
    if (!path) return mapUberExpense(row, null)

    const { data: signed } = await admin().storage.from(bucket).createSignedUrl(path, 60 * 30)
    return mapUberExpense(row, signed?.signedUrl || null)
  }))
}

export async function getColabData(userEmail: string): Promise<ColabData> {
  const normalizedEmail = userEmail.trim()
  const flexProfileResult = await getGkitFlexProfileByEmail(normalizedEmail)

  if (flexProfileResult.error || !flexProfileResult.data) {
    return emptyData(
      !flexProfileResult.error,
      flexProfileResult.error
        ? 'Não foi possível consultar o cadastro de colaboradores.'
        : 'O e-mail do usuário ainda não está vinculado a um colaborador ativo no GKIT Flex.',
    )
  }

  const sourceProfile = flexProfileResult.data as Record<string, unknown>
  const collaborator = mapCollaborator(sourceProfile)
  const carteiraNome = text(sourceProfile.time_nome)

  const [commissionRowsResult, paymentRowsResult] = await Promise.all([
    admin()
      .from('comissao_resumos')
      .select('id, execucao_id, categoria, carteira, valor_recebido, valor_apos_reducao, percentual_comissao, comissao_final, created_at')
      .eq('carteira', carteiraNome)
      .order('created_at', { ascending: false })
      .limit(24),
    admin()
      .from('contas_pagar_itens')
      .select('id, competencia, descricao, valor_previsto, pago, origem_tipo, origem_resumo_id, raw, created_at, updated_at')
      .eq('origem_tipo', 'comissao')
      .order('competencia', { ascending: false })
      .limit(200),
  ])

  const commissionRows = commissionRowsResult.error
    ? []
    : ((commissionRowsResult.data ?? []) as Array<Record<string, unknown>>)

  const executionIds = [...new Set(commissionRows.map((row) => text(row.execucao_id)).filter(Boolean))]
  const executionsResult = executionIds.length
    ? await admin()
      .from('comissao_execucoes')
      .select('id, competencia, status, created_at')
      .in('id', executionIds)
    : { data: [], error: null }

  const executionsById = new Map(
    (((executionsResult.data ?? []) as Array<Record<string, unknown>>).map((row) => [text(row.id), row])),
  )

  const paymentRows = paymentRowsResult.error
    ? []
    : ((paymentRowsResult.data ?? []) as Array<Record<string, unknown>>)
      .filter((row) => text((row.raw as Record<string, unknown> | null)?.carteira) === carteiraNome)
      .slice(0, 24)

  const paidSummaryIds = new Set(
    paymentRows
      .filter((row) => Boolean(row.pago) && row.origem_resumo_id)
      .map((row) => text(row.origem_resumo_id)),
  )

  const payments = paymentRows.map(mapGkitFlexPayment)
  const commissions = commissionRows.map((row) => mapGkitFlexCommission(row, executionsById, paidSummaryIds))
  const uber = await listUberExpensesForUser(collaborator.id)

  return {
    collaborator,
    payments,
    commissions,
    benefits: buildBenefits(collaborator, sourceProfile),
    uber,
    databaseReady: true,
    source: {
      label: 'GKIT Flex',
      status: 'sincronizado',
      message: `Dados sincronizados pelo e-mail institucional ${collaborator.email}.`,
    },
    summary: buildSummary(payments, commissions, uber),
  }
}

export async function getColabUberData(userEmail: string): Promise<ColabUberData> {
  const flexProfileResult = await getGkitFlexProfileByEmail(userEmail.trim())

  if (flexProfileResult.error || !flexProfileResult.data) {
    return {
      collaborator: null,
      clients: [],
      expenses: [],
      canCreate: false,
    }
  }

  const collaborator = mapCollaborator(flexProfileResult.data as Record<string, unknown>)
  const [clientsResult, expenses] = await Promise.all([
    admin()
      .schema('ciclo')
      .from('clientes')
      .select('id,nome,documento,status_operacional,ativo')
      .eq('ativo', true)
      .order('nome', { ascending: true })
      .limit(800),
    listUberExpensesForUser(collaborator.id),
  ])

  const clients = ((clientsResult.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: text(row.id),
    label: text(row.nome, 'Cliente'),
    meta: [text(row.documento), text(row.status_operacional)].filter(Boolean).join(' · '),
  }))

  return {
    collaborator,
    clients,
    expenses,
    canCreate: true,
  }
}
