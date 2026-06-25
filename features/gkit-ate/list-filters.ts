import type {
  GkitAteAtendimento,
  GkitAteAtendimentoTipo,
  GkitAteStatus,
  GkitAteTarefa,
  GkitAteTarefaStatus,
  GkitAteTarefaTipo,
} from '@/features/gkit-ate/types'

type SearchParams = Record<string, string | string[] | null | undefined>
type SortDirection = 'asc' | 'desc'

export type GkitAteAtendimentoFilters = {
  dir: SortDirection
  q: string
  responsavel: string
  sort: 'data' | 'status' | 'cliente' | 'responsavel' | 'tarefas'
  status: GkitAteStatus | ''
  tipo: string
}

export type GkitAteTarefaFilters = {
  dir: SortDirection
  q: string
  responsavel: string
  sort: 'data' | 'status' | 'responsavel' | 'atendimento'
  status: GkitAteTarefaStatus | ''
  tipo: string
}

export type GkitAteCadastroTab = 'atendimentos' | 'tarefas'

export type GkitAteCadastroFilters = {
  ativo: 'ativo' | 'inativo' | ''
  dir: SortDirection
  q: string
  sort: 'nome' | 'criado' | 'tarefa'
  tab: GkitAteCadastroTab
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

function atendimentoStatus(value: string): GkitAteStatus | '' {
  return value === 'aberto' || value === 'encerrado' ? value : ''
}

function tarefaStatus(value: string): GkitAteTarefaStatus | '' {
  if (value === 'pendente' || value === 'em_andamento' || value === 'concluida' || value === 'cancelada') return value
  return ''
}

function ativoFilter(value: string): GkitAteCadastroFilters['ativo'] {
  return value === 'ativo' || value === 'inativo' ? value : ''
}

function cadastroTab(value: string): GkitAteCadastroTab {
  return value === 'tarefas' ? 'tarefas' : 'atendimentos'
}

export function buildGkitAteAtendimentoFilters(params?: SearchParams): GkitAteAtendimentoFilters {
  const sort = param(params, 'sort')

  return {
    dir: direction(param(params, 'dir') || 'desc'),
    q: param(params, 'q'),
    responsavel: param(params, 'responsavel'),
    sort: sort === 'status' || sort === 'cliente' || sort === 'responsavel' || sort === 'tarefas' ? sort : 'data',
    status: atendimentoStatus(param(params, 'status')),
    tipo: param(params, 'tipo'),
  }
}

export function buildGkitAteTarefaFilters(params?: SearchParams): GkitAteTarefaFilters {
  const sort = param(params, 'sort')

  return {
    dir: direction(param(params, 'dir')),
    q: param(params, 'q'),
    responsavel: param(params, 'responsavel'),
    sort: sort === 'status' || sort === 'responsavel' || sort === 'atendimento' ? sort : 'data',
    status: tarefaStatus(param(params, 'status')),
    tipo: param(params, 'tipo'),
  }
}

export function buildGkitAteCadastroFilters(params?: SearchParams): GkitAteCadastroFilters {
  const sort = param(params, 'sort')

  return {
    ativo: ativoFilter(param(params, 'ativo')),
    dir: direction(param(params, 'dir')),
    q: param(params, 'q'),
    sort: sort === 'criado' || sort === 'tarefa' ? sort : 'nome',
    tab: cadastroTab(param(params, 'tab')),
  }
}

export function filterGkitAteAtendimentos(atendimentos: GkitAteAtendimento[], filters: GkitAteAtendimentoFilters) {
  const search = normalize(filters.q)

  return atendimentos
    .filter((atendimento) => {
      const matchesStatus = !filters.status || atendimento.status === filters.status
      const matchesTipo = !filters.tipo || atendimento.atendimento_tipo_id === filters.tipo
      const matchesResponsavel = !filters.responsavel || atendimento.responsavel === filters.responsavel
      const matchesSearch = !search || [
        atendimento.codigo_publico,
        atendimento.astrea_codigo,
        atendimento.titulo,
        atendimento.cliente_nome,
        atendimento.tipo,
        atendimento.objeto,
        atendimento.responsavel,
        atendimento.status,
      ].some((value) => normalize(value).includes(search))

      return matchesStatus && matchesTipo && matchesResponsavel && matchesSearch
    })
    .sort((a, b) => {
      const left = filters.sort === 'status'
        ? a.status
        : filters.sort === 'cliente'
          ? a.cliente_nome
          : filters.sort === 'responsavel'
            ? a.responsavel
            : filters.sort === 'tarefas'
              ? a.tarefas_pendentes
              : a.data_criacao ?? a.codigo_publico
      const right = filters.sort === 'status'
        ? b.status
        : filters.sort === 'cliente'
          ? b.cliente_nome
          : filters.sort === 'responsavel'
            ? b.responsavel
            : filters.sort === 'tarefas'
              ? b.tarefas_pendentes
              : b.data_criacao ?? b.codigo_publico
      return compareValues(left, right, filters.dir)
    })
}

export function filterGkitAteTarefas(tarefas: GkitAteTarefa[], filters: GkitAteTarefaFilters) {
  const search = normalize(filters.q)

  return tarefas
    .filter((tarefa) => {
      const matchesStatus = !filters.status || tarefa.status === filters.status
      const matchesTipo = !filters.tipo || tarefa.tarefa_tipo_id === filters.tipo
      const matchesResponsavel = !filters.responsavel || tarefa.responsavel === filters.responsavel
      const matchesSearch = !search || [
        tarefa.descricao,
        tarefa.tipo_nome,
        tarefa.responsavel,
        tarefa.cliente_nome,
        tarefa.atendimento_titulo,
        tarefa.status,
      ].some((value) => normalize(value).includes(search))

      return matchesStatus && matchesTipo && matchesResponsavel && matchesSearch
    })
    .sort((a, b) => {
      const left = filters.sort === 'status'
        ? a.status
        : filters.sort === 'responsavel'
          ? a.responsavel
          : filters.sort === 'atendimento'
            ? a.atendimento_titulo
            : a.data_prevista ?? ''
      const right = filters.sort === 'status'
        ? b.status
        : filters.sort === 'responsavel'
          ? b.responsavel
          : filters.sort === 'atendimento'
            ? b.atendimento_titulo
            : b.data_prevista ?? ''
      return compareValues(left, right, filters.dir)
    })
}

export function filterGkitAteAtendimentoTipos(tipos: GkitAteAtendimentoTipo[], filters: GkitAteCadastroFilters) {
  const search = normalize(filters.q)

  return tipos
    .filter((tipo) => {
      const matchesAtivo = !filters.ativo || (filters.ativo === 'ativo' ? tipo.ativo : !tipo.ativo)
      const matchesSearch = !search || [
        tipo.label,
        tipo.tarefaTipoNome,
        tipo.ativo ? 'ativo' : 'inativo',
      ].some((value) => normalize(value).includes(search))

      return matchesAtivo && matchesSearch
    })
    .sort((a, b) => {
      const left = filters.sort === 'criado' ? a.criado_em : filters.sort === 'tarefa' ? a.tarefaTipoNome : a.label
      const right = filters.sort === 'criado' ? b.criado_em : filters.sort === 'tarefa' ? b.tarefaTipoNome : b.label
      return compareValues(left, right, filters.dir)
    })
}

export function filterGkitAteTarefaTipos(tipos: GkitAteTarefaTipo[], filters: GkitAteCadastroFilters) {
  const search = normalize(filters.q)

  return tipos
    .filter((tipo) => {
      const matchesAtivo = !filters.ativo || (filters.ativo === 'ativo' ? tipo.ativo : !tipo.ativo)
      const matchesSearch = !search || [
        tipo.label,
        tipo.descricaoPadrao,
        tipo.ativo ? 'ativo' : 'inativo',
      ].some((value) => normalize(value).includes(search))

      return matchesAtivo && matchesSearch
    })
    .sort((a, b) => {
      const left = filters.sort === 'criado' ? a.criado_em : a.label
      const right = filters.sort === 'criado' ? b.criado_em : b.label
      return compareValues(left, right, filters.dir)
    })
}
