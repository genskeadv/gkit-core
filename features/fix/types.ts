export * from '@/features/fix/_legacy/intr-types'

export type FixFechamentoChecklistItem = {
  key: string
  label: string
  description: string
  ok: boolean
  total: number
  pendencias: number
  value?: string
  href?: string
}

export type FixFechamentoGovernanca = {
  id: string
  competencia: string
  competenciaLabel: string
  status: string
  receitaTotal: number
  despesaTotal: number
  orcamentoTotal: number
  comissaoTotal: number
  pagamentosPrevistosTotal: number
  pagamentosPagosTotal: number
  saldoOperacional: number
  pendenciasTotal: number
  fechadoEm: string | null
  atualizadoEm: string | null
  observacao: string | null
  reaberturaMotivo: string | null
  checklist: FixFechamentoChecklistItem[]
}
