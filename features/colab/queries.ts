import { requireModuleAccess } from '@/lib/auth/platform'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type {
  ColabBenefit,
  ColabCollaborator,
  ColabCommission,
  ColabData,
  ColabDocument,
  ColabPayment,
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
  if (!value) return 'Sem competencia'
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'UTC', year: 'numeric' }).format(date)
}

function mapCollaborator(row: Record<string, unknown>): ColabCollaborator {
  return {
    id: text(row.id),
    name: text(row.nome, 'Colaborador'),
    email: text(row.email),
    phone: text(row.telefone, 'Nao informado'),
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
    documents: [],
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
    },
  }
}

function buildSummary(payments: ColabPayment[], commissions: ColabCommission[]): ColabData['summary'] {
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

function buildDocuments(
  _collaborator: ColabCollaborator,
  payments: ColabPayment[],
  commissions: ColabCommission[],
): ColabDocument[] {
  const paymentDocs = payments.slice(0, 12).map((payment) => ({
    id: `${payment.id}-demonstrativo`,
    title: `Demonstrativo ${payment.competence}`,
    type: 'PDF',
    reference: payment.competence,
    status: payment.status === 'pago' ? 'disponivel' : 'pendente',
    updatedAt: payment.paymentDate,
  }))

  const commissionDocs = commissions.slice(0, 6).map((commission) => ({
    id: `${commission.id}-comissao`,
    title: `Resumo de comissao ${commission.reference}`,
    type: 'PDF',
    reference: commission.reference,
    status: commission.status === 'paga' || commission.status === 'aprovada' ? 'disponivel' : 'pendente',
    updatedAt: commission.createdAt,
  }))

  return [...paymentDocs, ...commissionDocs].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )
}

export async function requireColabContext() {
  return requireModuleAccess('colab')
}

async function getGkitFlexProfileByEmail(normalizedEmail: string) {
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

export async function getColabData(userEmail: string): Promise<ColabData> {
  const normalizedEmail = userEmail.trim()
  const flexProfileResult = await getGkitFlexProfileByEmail(normalizedEmail)

  if (flexProfileResult.error || !flexProfileResult.data) {
    return emptyData(
      !flexProfileResult.error,
      flexProfileResult.error
        ? 'Nao foi possivel consultar o cadastro de colaboradores.'
        : 'O e-mail do usuario ainda nao esta vinculado a um colaborador ativo no GKIT Flex.',
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

  return {
    collaborator,
    payments,
    commissions,
    benefits: buildBenefits(collaborator, sourceProfile),
    documents: buildDocuments(collaborator, payments, commissions),
    databaseReady: true,
    source: {
      label: 'GKIT Flex',
      status: 'sincronizado',
      message: `Dados sincronizados pelo e-mail institucional ${collaborator.email}.`,
    },
    summary: buildSummary(payments, commissions),
  }
}
