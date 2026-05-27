export type StatusRegistro = 'ativo' | 'inativo' | 'arquivado'
export type StatusUsuario = 'ativo' | 'inativo' | 'bloqueado' | 'pendente'
export type TipoUsuario = 'admin_global' | 'admin_carteira' | 'gestor' | 'operador' | 'visualizador'

export type AdminMetric = {
  label: string
  value: number | string
}
