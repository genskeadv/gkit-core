import type { CrmOportunidade, CrmStage } from '@/features/crm/types'

export const stageLabel: Record<CrmStage, string> = {
  lead: 'Lead',
  diagnostico: 'Diagnóstico',
  proposta: 'Proposta',
  negociacao: 'Negociação',
  fechado: 'Fechado',
  perdido: 'Perdido',
}

export const stageOrder: CrmStage[] = ['lead', 'diagnostico', 'proposta', 'negociacao', 'fechado', 'perdido']

export function isCrmStage(value: unknown): value is CrmStage {
  return typeof value === 'string' && stageOrder.includes(value as CrmStage)
}

export function formatBRL(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    currency: 'BRL',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(value)
}

export function opportunityScore(o: Pick<CrmOportunidade, 'valor' | 'probabilidade' | 'diasSemInteracao' | 'etapa'>) {
  const valorNormalizado = Math.min(o.valor / 1000, 100)
  const stageBonus = o.etapa === 'negociacao' ? 12 : o.etapa === 'proposta' ? 8 : o.etapa === 'diagnostico' ? 4 : 0
  const atrasoPenalty = Math.min(o.diasSemInteracao * 2.5, 30)
  return Math.max(0, Math.round(valorNormalizado * 0.35 + o.probabilidade * 0.55 + stageBonus - atrasoPenalty))
}

export function riskTone(o: Pick<CrmOportunidade, 'probabilidade' | 'diasSemInteracao' | 'etapa'>) {
  if (o.etapa === 'perdido') return 'danger'
  if (o.etapa === 'fechado') return 'success'
  if (o.diasSemInteracao >= 5 || o.probabilidade < 40) return 'danger'
  if (o.diasSemInteracao >= 3 || o.probabilidade < 70) return 'warning'
  return 'success'
}

export function riskLabel(o: Pick<CrmOportunidade, 'probabilidade' | 'diasSemInteracao' | 'etapa'>) {
  const tone = riskTone(o)
  if (tone === 'success') return 'Quente'
  if (tone === 'warning') return 'Atenção'
  return 'Risco'
}

export function recommendedAction(o: Pick<CrmOportunidade, 'etapa' | 'probabilidade' | 'diasSemInteracao'>) {
  if (o.diasSemInteracao >= 5) return 'Follow-up urgente'
  if (o.etapa === 'proposta') return 'Cobrar retorno da proposta'
  if (o.etapa === 'negociacao' && o.probabilidade >= 70) return 'Tentar fechamento hoje'
  if (o.etapa === 'diagnostico') return 'Gerar proposta'
  if (o.etapa === 'lead') return 'Qualificar contato'
  return 'Revisar oportunidade'
}
