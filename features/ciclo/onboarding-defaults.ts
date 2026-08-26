export const cicloOnboardingDocumentos = [
  { tipo_documento: 'contrato', titulo: 'Contrato' },
  { tipo_documento: 'cartao_cnpj', titulo: 'Cartão CNPJ' },
  { tipo_documento: 'ata_eleicao', titulo: 'Ata eleição' },
  { tipo_documento: 'ata_previsao_orcamentaria', titulo: 'Ata previsão orçamentária' },
  { tipo_documento: 'cpf_sindico', titulo: 'CPF síndico' },
  { tipo_documento: 'cnpj_empresa_sindico', titulo: 'CNPJ empresa síndico' },
  { tipo_documento: 'convencao', titulo: 'Convenção' },
  { tipo_documento: 'regulamento', titulo: 'Regulamento' },
  { tipo_documento: 'cadastro_unidade', titulo: 'Cadastro de unidade' },
] as const

export const cicloOnboardingEtapas = [
  {
    id: 'cadastro',
    titulo: 'Cadastro',
    descricao: 'Dados base, vínculos e preparação do cliente nos sistemas.',
  },
  {
    id: 'recepcao',
    titulo: 'Recepção',
    descricao: 'Boas-vindas, alinhamento inicial e canais de comunicação.',
  },
  {
    id: 'documentacao',
    titulo: 'Documentação',
    descricao: 'Checklist documental, recebimento e validação da matriz.',
  },
  {
    id: 'operacao',
    titulo: 'Operação',
    descricao: 'Transição para rotina operacional e acompanhamento da carteira.',
  },
] as const

export type CicloOnboardingEtapaId = (typeof cicloOnboardingEtapas)[number]['id']

export function cicloOnboardingWorkflowEtapa(descricao: string, ordem = 0): CicloOnboardingEtapaId {
  const normalized = descricao.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

  if (
    normalized.includes('cliente nos sistemas') ||
    normalized.includes('atribuir carteira') ||
    normalized.includes('cadastro') ||
    ordem <= 20
  ) {
    return 'cadastro'
  }

  if (
    normalized.includes('boas vindas') ||
    normalized.includes('recepcao') ||
    normalized.includes('reuniao') ||
    normalized.includes('apresentar equipe') ||
    normalized.includes('whatsapp')
  ) {
    return 'recepcao'
  }

  if (
    normalized.includes('document') ||
    normalized.includes('checklist') ||
    normalized.includes('validar') ||
    normalized.includes('receber')
  ) {
    return 'documentacao'
  }

  return 'operacao'
}
