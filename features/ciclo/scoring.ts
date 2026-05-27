import type { CicloAlerta, CicloCliente, CicloDocumento, CicloRisco } from '@/features/ciclo/types'

export function formatDocumento(value: unknown) {
  const digits = String(value ?? '').replace(/\D/g, '')
  if (digits.length === 14) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
  }
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
  }
  return String(value ?? 'Sem documento')
}

export function formatDate(value: string) {
  if (!value) return 'Sem prazo'
  const parsed = new Date(String(value))
  if (Number.isNaN(parsed.getTime())) return 'Sem prazo'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(parsed)
}

export function riskTone(value: CicloRisco | CicloAlerta['severidade'] | CicloDocumento['status']) {
  if (value === 'critico' || value === 'critica' || value === 'vencido') return 'danger'
  if (value === 'alto' || value === 'alta' || value === 'pendente') return 'warning'
  if (value === 'baixo' || value === 'baixa' || value === 'validado' || value === 'recebido') return 'success'
  return 'primary'
}

export function priorityScore(cliente: CicloCliente) {
  const risk = cliente.risco === 'critico' ? 52 : cliente.risco === 'alto' ? 38 : cliente.risco === 'medio' ? 22 : 8
  const scoreGap = Math.max(0, 100 - cliente.score) * 0.28
  const regularidadeGap = Math.max(0, 100 - cliente.regularidade) * 0.34
  const alertas = Math.min(cliente.alertasAbertos * 8, 32)
  const temperatura = cliente.temperatura === 'frio' ? 10 : cliente.temperatura === 'neutro' ? 4 : 0
  return Math.round(risk + scoreGap + regularidadeGap + alertas + temperatura)
}

export function priorityLabel(cliente: CicloCliente) {
  const score = priorityScore(cliente)
  if (score >= 82) return 'Crítica'
  if (score >= 62) return 'Alta'
  if (score >= 42) return 'Média'
  return 'Baixa'
}

export function normalizePercent(value: unknown) {
  const number = Number(value ?? 0)
  if (!Number.isFinite(number)) return 0
  return Math.max(0, Math.min(100, Math.round(number)))
}
