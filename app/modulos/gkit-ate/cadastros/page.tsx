import { GkitAteFilterBar, GkitAteHealthNotice, GkitAteList, GkitAteSection, GkitAteShell, GkitAteSummaryCards, GkitAteTabs } from '@/features/gkit-ate/components'
import {
  buildGkitAteCadastroFilters,
  filterGkitAteAtendimentoTipos,
  filterGkitAteTarefaTipos,
} from '@/features/gkit-ate/list-filters'
import { getGkitAteHealth, listGkitAteAtendimentoTipos, listGkitAteTarefaTipos, requireGkitAteContext } from '@/features/gkit-ate/queries'
import { moduleTarget } from '@/lib/auth/platform'

export default async function GkitAteCadastrosPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const context = await requireGkitAteContext(moduleTarget('/modulos/gkit-ate/cadastros', params))
  const [health, atendimentoTipos, tarefaTipos] = await Promise.all([
    getGkitAteHealth(),
    listGkitAteAtendimentoTipos(),
    listGkitAteTarefaTipos(),
  ])
  const filters = buildGkitAteCadastroFilters(params)
  const atendimentoTiposFiltrados = filterGkitAteAtendimentoTipos(atendimentoTipos, filters)
  const tarefaTiposFiltrados = filterGkitAteTarefaTipos(tarefaTipos, filters)
  const isAtendimentoTab = filters.tab === 'atendimentos'
  const tabHref = (tab: 'atendimentos' | 'tarefas') => {
    const query = new URLSearchParams()
    query.set('tab', tab)
    if (filters.q) query.set('q', filters.q)
    if (filters.ativo) query.set('ativo', filters.ativo)
    query.set('sort', tab === 'tarefas' && filters.sort === 'tarefa' ? 'nome' : filters.sort)
    query.set('dir', filters.dir)
    return `/modulos/gkit-ate/cadastros?${query.toString()}`
  }
  const activeRows = isAtendimentoTab
    ? atendimentoTiposFiltrados.map((item) => ({
      id: item.id,
      title: item.label,
      subtitle: item.tarefaTipoNome ? `Tarefa padrão: ${item.tarefaTipoNome}` : 'Sem tarefa padrão',
      status: item.ativo ? 'Ativo' : 'Inativo',
      value: 'ATE',
      meta: 'Tipo de atendimento',
      tone: item.ativo ? 'primary' as const : 'warning' as const,
    }))
    : tarefaTiposFiltrados.map((item) => ({
      id: item.id,
      title: item.label,
      subtitle: item.descricaoPadrao,
      status: item.ativo ? 'Ativo' : 'Inativo',
      value: 'Tarefa',
      meta: 'Tipo de tarefa',
      tone: item.ativo ? 'primary' as const : 'warning' as const,
    }))
  const cadastroSummary = isAtendimentoTab
    ? [
      { label: 'Total', value: atendimentoTiposFiltrados.length },
      { label: 'Ativos', value: atendimentoTiposFiltrados.filter((item) => item.ativo).length },
      { label: 'Inativos', value: atendimentoTiposFiltrados.filter((item) => !item.ativo).length },
      { label: 'Com tarefa padrão', value: atendimentoTiposFiltrados.filter((item) => item.tarefaTipoId).length },
    ]
    : [
      { label: 'Total', value: tarefaTiposFiltrados.length },
      { label: 'Ativos', value: tarefaTiposFiltrados.filter((item) => item.ativo).length },
      { label: 'Inativos', value: tarefaTiposFiltrados.filter((item) => !item.ativo).length },
      { label: 'Com descrição', value: tarefaTiposFiltrados.filter((item) => item.descricaoPadrao).length },
    ]
  const hasFilters = Boolean(filters.q || filters.ativo || filters.sort !== 'nome' || filters.dir !== 'asc')

  return (
    <GkitAteShell
      active="cadastros"
      title="Cadastros"
      description="Tipos de atendimento e tipos de tarefa usados pelo fluxo operacional."
      usuario={context.usuario}
    >
      <GkitAteHealthNotice health={health} />
      <GkitAteSection title="Cadastros" description={`${activeRows.length} registro(s)`}>
        <GkitAteTabs
          items={[
            { active: isAtendimentoTab, count: atendimentoTipos.length, href: tabHref('atendimentos'), label: 'Tipos de atendimento' },
            { active: !isAtendimentoTab, count: tarefaTipos.length, href: tabHref('tarefas'), label: 'Tipos de tarefa' },
          ]}
        />
        <GkitAteSummaryCards items={cadastroSummary} />
        <GkitAteFilterBar
          fields={[
            { label: 'Busca', name: 'q', placeholder: isAtendimentoTab ? 'Tipo ou tarefa padrão' : 'Tipo ou descrição padrão', value: filters.q },
            {
              label: 'Status',
              name: 'ativo',
              options: [
                { label: 'Ativo', value: 'ativo' },
                { label: 'Inativo', value: 'inativo' },
              ],
              placeholder: 'Todos',
              type: 'select',
              value: filters.ativo,
            },
          ]}
          hasFilters={hasFilters}
          hiddenFields={[{ name: 'tab', value: filters.tab }]}
          resetHref={`/modulos/gkit-ate/cadastros?tab=${filters.tab}`}
          sort={{
            dir: filters.dir,
            options: [
              { label: 'Nome', value: 'nome' },
              { label: 'Criação', value: 'criado' },
              ...(isAtendimentoTab ? [{ label: 'Tarefa padrão', value: 'tarefa' }] : []),
            ],
            value: filters.sort,
          }}
        />
        <GkitAteList
          empty={isAtendimentoTab ? 'Nenhum tipo de atendimento encontrado com os filtros atuais.' : 'Nenhum tipo de tarefa encontrado com os filtros atuais.'}
          rows={activeRows}
        />
      </GkitAteSection>
    </GkitAteShell>
  )
}
