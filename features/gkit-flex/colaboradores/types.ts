export type GkitFlexColaboradorStatus = 'ativo' | 'inativo' | 'afastado' | 'encerrado';

export type GkitFlexOption = {
  id: string;
  label: string;
  detail?: string;
};

export type GkitFlexColaborador = {
  id: string;
  usuario_id: string;
  carteira_id: string | null;
  gestor_usuario_id: string | null;
  cargo_operacional: string | null;
  documento: string | null;
  telefone: string | null;
  chave_pix: string | null;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  tipo_conta: string | null;
  data_inicio: string | null;
  status: GkitFlexColaboradorStatus;
  salario: number;
  participacao_honorarios: number;
  pro_labore: number;
  ajuda_custo: number;
  outros_vencimentos: number;
  beneficio_descricao: string | null;
  beneficio_valor: number;
  recebe_salario: boolean;
  recebe_participacao_honorarios: boolean;
  recebe_pro_labore: boolean;
  recebe_beneficios: boolean;
  recebe_outros: boolean;
  recebe_comissoes: boolean;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  usuario_nome: string;
  usuario_email: string;
  carteira_nome: string | null;
  gestor_nome: string | null;
  total_mensal: number;
};

export type GkitFlexColaboradoresResumo = {
  total: number;
  ativos: number;
  recebemComissao: number;
  custoMensal: number;
};

export type GkitFlexColaboradoresData = {
  colaboradores: GkitFlexColaborador[];
  resumo: GkitFlexColaboradoresResumo;
};

export type GkitFlexColaboradorFormData = {
  colaborador: GkitFlexColaborador | null;
  usuarios: GkitFlexOption[];
  carteiras: GkitFlexOption[];
  gestores: GkitFlexOption[];
};
