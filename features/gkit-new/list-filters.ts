import type {
  GkitNewCliente,
  GkitNewContato,
  GkitNewOportunidade,
  GkitNewOportunidadeStatus,
  GkitNewOportunidadeTipo,
  GkitNewTarefa,
  GkitNewWorkflowModelo,
} from '@/features/gkit-new/types'

type SearchParams = Record<string, string | string[] | null | undefined>
type SortDirection = 'asc' | 'desc'

export type GkitNewClienteFilters = {
  dir: SortDirection
  q: string
  sort: 'nome' | 'status' | 'contatos' | 'oportunidades'
  status: GkitNewCliente['status'] | ''
}

export type GkitNewContatoFilters = {
  dir: SortDirection
  q: string
  sort: 'nome' | 'clientes'
  vinculo: 'com_clientes' | 'sem_clientes' | ''
}

export type GkitNewOportunidadeFilters = {
  dir: SortDirection
  q: string
  responsavel: string
  sort: 'data' | 'valor' | 'status' | 'cliente' | 'tarefas'
  status: GkitNewOportunidadeStatus | ''
  tipo: GkitNewOportunidadeTipo | ''
}

export type GkitNewTarefaFilters = {
  dir: SortDirection
  q: string
  responsavel: string
  sort: 'data' | 'status' | 'responsavel' | 'cliente'
  status: GkitNewTarefa['status'] | ''
}

export type GkitNewWorkflowFilters = {
  ativo: 'ativo' | 'inativo' | ''
  dir: SortDirection
  q: string
  responsavel: string
  sort: 'ordem' | 'dias' | 'responsavel' | 'descricao'
}

function param(params: SearchParams | undefined, key: string) {
  const value = params?.[key]
  const first = Array.isArray(value) ? value[0] : value
  return typeof first === 'string' ? first.trim() : ''
}

function direction(value: string): SortDirection {
  return value === 'desc' ? 'desc' : 'asc'
}

function normalize(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function compareValues(left: unknown, right: unknown, dir: SortDirection) {
  const result = typeof left === 'number' && typeof right === 'number'
    ? left - right
    : String(left ?? '').localeCompare(String(right ?? ''), 'pt-BR', { sensitivity: 'base' })

  return dir === 'desc' ? -result : result
}

function clienteStatus(value: string): GkitNewCliente['status'] | '' {
  return value === 'ativo' || value === 'prospecto' ? value : ''
}

function oportunidadeStatus(value: string): GkitNewOportunidadeStatus | '' {
  if (value === 'nova' || value === 'proposta_enviada' || value === 'em_negociacao' || value === 'aprovada' || value === 'rejeitada' || value === 'cancelada' || value === 'encerrada') return value
  return ''
}

function oportunidadeTipo(value: string): GkitNewOportunidadeTipo | '' {
  return value === 'mensal' || value === 'pontual' ? value : ''
}

function tarefaStatus(value: string): GkitNewTarefa['status'] | '' {
  return value === 'pendente' || value === 'concluida' || value === 'cancelada' ? value : ''
}

export function buildGkitNewClienteFilters(params?: SearchParams): GkitNewClienteFilters {
  const sort = param(params, 'sort')

  return {
    dir: direction(param(params, 'dir')),
    q: param(params, 'q'),
    sort: sort === 'status' || sort === 'contatos' || sort === 'oportunidades' ? sort : 'nome',
    status: clienteStatus(param(params, 'status')),
  }
}

export function buildGkitNewContatoFilters(params?: SearchParams): GkitNewContatoFilters {
  const sort = param(params, 'sort')
  const vinculo = param(params, 'vinculo')

  return {
    dir: direction(param(params, 'dir')),
    q: param(params, 'q'),
    sort: sort === 'clientes' ? sort : 'nome',
    vinculo: vinculo === 'com_clientes' || vinculo === 'sem_clientes' ? vinculo : '',
  }
}

export function buildGkitNewOportunidadeFilters(params?: SearchParams): GkitNewOportunidadeFilters {
  const sort = param(params, 'sort')

  return {
    dir: direction(param(params, 'dir')),
    q: param(params, 'q'),
    responsavel: param(params, 'responsavel'),
    sort: sort === 'valor' || sort === 'status' || sort === 'cliente' || sort === 'tarefas' ? sort : 'data',
    status: oportunidadeStatus(param(params, 'status')),
    tipo: oportunidadeTipo(param(params, 'tipo')),
  }
}

export function buildGkitNewTarefaFilters(params?: SearchParams): GkitNewTarefaFilters {
  const sort = param(params, 'sort')

  return {
    dir: direction(param(params, 'dir')),
    q: param(params, 'q'),
    responsavel: param(params, 'responsavel'),
    sort: sort === 'status' || sort === 'responsavel' || sort === 'cliente' ? sort : 'data',
    status: tarefaStatus(param(params, 'status')),
  }
}

export function buildGkitNewWorkflowFilters(params?: SearchParams): GkitNewWorkflowFilters {
  const ativo = param(params, 'ativo')
  const sort = param(params, 'sort')

  return {
    ativo: ativo === 'ativo' || ativo === 'inativo' ? ativo : '',
    dir: direction(param(params, 'dir')),
    q: param(params, 'q'),
    responsavel: param(params, 'responsavel'),
    sort: sort === 'dias' || sort === 'responsavel' || sort === 'descricao' ? sort : 'ordem',
  }
}

export function filterGkitNewClientes(clientes: GkitNewCliente[], filters: GkitNewClienteFilters) {
  const search = normalize(filters.q)

  return clientes
    .filter((cliente) => {
      const matchesStatus = !filters.status || cliente.status === filters.status
      const matchesSearch = !search || [
        cliente.nome,
        cliente.documento,
        cliente.documento_tipo,
        cliente.status,
        cliente.observacoes,
      ].some((value) => normalize(value).includes(search))

      return matchesStatus && matchesSearch
    })
    .sort((a, b) => {
      const left = filters.sort === 'status' ? a.status : filters.sort === 'contatos' ? a.contatos : filters.sort === 'oportunidades' ? a.oportunidades : a.nome
      const right = filters.sort === 'status' ? b.status : filters.sort === 'contatos' ? b.contatos : filters.sort === 'oportunidades' ? b.oportunidades : b.nome
      return compareValues(left, right, filters.dir)
    })
}

export function filterGkitNewContatos(contatos: GkitNewContato[], filters: GkitNewContatoFilters) {
  const search = normalize(filters.q)

  return contatos
    .filter((contato) => {
      const matchesVinculo = !filters.vinculo || (filters.vinculo === 'com_clientes' ? contato.clientes > 0 : contato.clientes === 0)
      const matchesSearch = !search || [
        contato.nome,
        contato.email,
        contato.celular,
        contato.descricao,
      ].some((value) => normalize(value).includes(search))

      return matchesVinculo && matchesSearch
    })
    .sort((a, b) => {
      const left = filters.sort === 'clientes' ? a.clientes : a.nome
      const right = filters.sort === 'clientes' ? b.clientes : b.nome
      return compareValues(left, right, filters.dir)
    })
}

export function filterGkitNewOportunidades(oportunidades: GkitNewOportunidade[], filters: GkitNewOportunidadeFilters) {
  const search = normalize(filters.q)

  return oportunidades
    .filter((oportunidade) => {
      const matchesStatus = !filters.status || oportunidade.status === filters.status
      const matchesTipo = !filters.tipo || oportunidade.tipo === filters.tipo
      const matchesResponsavel = !filters.responsavel || oportunidade.responsavel_id === filters.responsavel
      const matchesSearch = !search || [
        oportunidade.descricao,
        oportunidade.cliente_nome,
        oportunidade.contato_nome,
        oportunidade.escopo,
        oportunidade.responsavel_nome,
        oportunidade.status,
      ].some((value) => normalize(value).includes(search))

      return matchesStatus && matchesTipo && matchesResponsavel && matchesSearch
    })
    .sort((a, b) => {
      const left = filters.sort === 'valor' ? a.valor : filters.sort === 'status' ? a.status : filters.sort === 'cliente' ? a.cliente_nome : filters.sort === 'tarefas' ? a.tarefas_pendentes : a.data
      const right = filters.sort === 'valor' ? b.valor : filters.sort === 'status' ? b.status : filters.sort === 'cliente' ? b.cliente_nome : filters.sort === 'tarefas' ? b.tarefas_pendentes : b.data
      return compareValues(left, right, filters.dir)
    })
}

export function filterGkitNewTarefas(tarefas: GkitNewTarefa[], filters: GkitNewTarefaFilters) {
  const search = normalize(filters.q)

  return tarefas
    .filter((tarefa) => {
      const matchesStatus = !filters.status || tarefa.status === filters.status
      const matchesResponsavel = !filters.responsavel || tarefa.responsavel_id === filters.responsavel
      const matchesSearch = !search || [
        tarefa.descricao,
        tarefa.cliente_nome,
        tarefa.oportunidade_descricao,
        tarefa.responsavel_nome,
        tarefa.status,
      ].some((value) => normalize(value).includes(search))

      return matchesStatus && matchesResponsavel && matchesSearch
    })
    .sort((a, b) => {
      const left = filters.sort === 'status' ? a.status : filters.sort === 'responsavel' ? a.responsavel_nome : filters.sort === 'cliente' ? a.cliente_nome : a.data_prevista
      const right = filters.sort === 'status' ? b.status : filters.sort === 'responsavel' ? b.responsavel_nome : filters.sort === 'cliente' ? b.cliente_nome : b.data_prevista
      return compareValues(left, right, filters.dir)
    })
}

export function filterGkitNewWorkflow(modelos: GkitNewWorkflowModelo[], filters: GkitNewWorkflowFilters) {
  const search = normalize(filters.q)

  return modelos
    .filter((modelo) => {
      const matchesAtivo = !filters.ativo || (filters.ativo === 'ativo' ? modelo.ativo : !modelo.ativo)
      const matchesResponsavel = !filters.responsavel || modelo.responsavel_id === filters.responsavel
      const matchesSearch = !search || [
        modelo.descricao,
        modelo.responsavel_nome,
        modelo.ativo ? 'ativo' : 'inativo',
      ].some((value) => normalize(value).includes(search))

      return matchesAtivo && matchesResponsavel && matchesSearch
    })
    .sort((a, b) => {
      const left = filters.sort === 'dias' ? a.dias : filters.sort === 'responsavel' ? a.responsavel_nome : filters.sort === 'descricao' ? a.descricao : a.ordem
      const right = filters.sort === 'dias' ? b.dias : filters.sort === 'responsavel' ? b.responsavel_nome : filters.sort === 'descricao' ? b.descricao : b.ordem
      return compareValues(left, right, filters.dir)
    })
}
