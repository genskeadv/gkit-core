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

function mapPayment(row: Record<string, unknown>): ColabPayment {
  return {
    id: text(row.id),
    type: text(row.pagamento_tipo_nome ?? row.tipo, 'Pagamento'),
    description: text(row.descricao ?? row.comissao_cliente ?? row.comissao_categoria, 'Demonstrativo do Intr'),
    competence: competenceLabel(row.competencia),
    grossAmount: numberValue(row.valor_bruto),
    discountAmount: numberValue(row.valor_descontos),
    netAmount: numberValue(row.valor_liquido),
    status: text(row.status, 'previsto'),
    paymentDate: dateValue(row.data_pagamento, row.data_prevista, row.competencia, row.criado_em),
    commissionId: text(row.comissao_id) || null,
  }
}

function mapCommission(row: Record<string, unknown>): ColabCommission {
  return {
    id: text(row.id),
    reference: competenceLabel(row.competencia),
    origin: [row.cliente, row.categoria_snapshot ?? row.categoria, row.tipo_comissao_snapshot]
      .map((item) => text(item))
      .filter(Boolean)
      .join(' - ') || 'Comissao',
    client: text(row.cliente, 'Sem cliente'),
    category: text(row.categoria_snapshot ?? row.categoria, 'Sem categoria'),
    baseAmount: numberValue(row.valor_base),
    percentage: numberValue(row.percentual),
    amount: numberValue(row.valor_comissao),
    status: text(row.status, 'calculada'),
    createdAt: dateValue(row.criado_em, row.competencia),
    paidAt: text(row.pago_em) || null,
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
      label: 'GKLI Intr',
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

  if (!description && value <= 0) return []

  return [
    {
      id: `${collaborator.id}-beneficio-principal`,
      name: description || 'Beneficio cadastrado',
      description: description || 'Beneficio sincronizado do cadastro do Intr.',
      status: 'ativo',
      provider: 'GKLI Intr',
      monthlyValue: value,
    },
  ]
}

function buildDocuments(
  collaborator: ColabCollaborator,
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

export async function getColabData(userEmail: string): Promise<ColabData> {
  const normalizedEmail = userEmail.trim()
  const profileResult = await admin()
    .from('gkli_intr_colaborador_detalhe')
    .select('*')
    .ilike('email', normalizedEmail)
    .maybeSingle()

  if (profileResult.error || !profileResult.data) {
    return emptyData(!profileResult.error, profileResult.error ? 'Nao foi possivel consultar o cadastro do Intr.' : 'O e-mail do usuario ainda nao esta vinculado a um colaborador ativo no Intr.')
  }

  const collaborator = mapCollaborator(profileResult.data as Record<string, unknown>)

  const [paymentsResult, commissionsResult] = await Promise.all([
    admin()
      .from('gkli_intr_pagamentos_resumo')
      .select('*')
      .eq('colaborador_id', collaborator.id)
      .neq('status', 'cancelado')
      .order('competencia', { ascending: false })
      .limit(24),
    admin()
      .from('gkli_intr_comissoes_resumo')
      .select('*')
      .eq('colaborador_id', collaborator.id)
      .neq('status', 'cancelada')
      .order('competencia', { ascending: false })
      .limit(24),
  ])

  const payments = paymentsResult.error ? [] : ((paymentsResult.data ?? []) as Array<Record<string, unknown>>).map(mapPayment)
  const commissions = commissionsResult.error
    ? []
    : ((commissionsResult.data ?? []) as Array<Record<string, unknown>>).map(mapCommission)

  return {
    collaborator,
    payments,
    commissions,
    benefits: buildBenefits(collaborator, profileResult.data as Record<string, unknown>),
    documents: buildDocuments(collaborator, payments, commissions),
    databaseReady: true,
    source: {
      label: 'GKLI Intr',
      status: 'sincronizado',
      message: `Dados sincronizados pelo e-mail institucional ${collaborator.email}.`,
    },
    summary: buildSummary(payments, commissions),
  }
}
