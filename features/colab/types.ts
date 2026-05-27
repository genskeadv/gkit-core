export type ColabCollaborator = {
  id: string
  name: string
  email: string
  phone: string
  role: string
  department: string
  manager: string
  status: string
  admissionDate: string
}

export type ColabPayment = {
  id: string
  type: string
  description: string
  competence: string
  grossAmount: number
  discountAmount: number
  netAmount: number
  status: string
  paymentDate: string
  commissionId: string | null
}

export type ColabCommission = {
  id: string
  reference: string
  origin: string
  client: string
  category: string
  baseAmount: number
  percentage: number
  amount: number
  status: string
  createdAt: string
  paidAt: string | null
}

export type ColabBenefit = {
  id: string
  name: string
  description: string
  status: string
  provider: string
  monthlyValue: number
}

export type ColabDocument = {
  id: string
  title: string
  type: string
  reference: string
  status: string
  updatedAt: string
}

export type ColabData = {
  collaborator: ColabCollaborator | null
  payments: ColabPayment[]
  commissions: ColabCommission[]
  benefits: ColabBenefit[]
  documents: ColabDocument[]
  databaseReady: boolean
  source: {
    label: string
    status: 'sincronizado' | 'pendente' | 'erro'
    message: string
  }
  summary: {
    latestPayment: number
    openCommissions: number
    approvedCommissions: number
    paidCommissions: number
    pendingPayments: number
  }
}
