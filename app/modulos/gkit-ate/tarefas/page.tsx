import { GkitAteFilterBar, GkitAteGroupedList, GkitAteHealthNotice, GkitAteSection, GkitAteShell } from '@/features/gkit-ate/components'
import { buildGkitAteTarefaFilters, filterGkitAteTarefas } from '@/features/gkit-ate/list-filters'
import { getGkitAteFormData, getGkitAteHealth, listGkitAteTarefas, requireGkitAteContext, tarefaRows } from '@/features/gkit-ate/queries'
import { moduleTarget } from '@/lib/auth/platform'

function tarefaHrefForPage(filters: ReturnType<typeof buildGkitAteTarefaFilters>, page: number) {
  const params = new URLSearchParams()
  if (filters.q) params.set('q', filters.q)
  if (filters.status) params.set('status', filters.status)
  if (filters.tipo) params.set('tipo', filters.tipo)
  if (filters.responsavel) params.set('responsavel', filters.responsavel)
  if (filters.sort !== 'data') params.set('sort', filters.sort)
  if (filters.dir !== 'asc') params.set('dir', filters.dir)
  if (page > 1) params.set('pagina', String(page))
  const query = params.toString()
  return query ? `/modulos/gkit-ate/tarefas?${query}` : '/modulos/gkit-ate/tarefas'
}

export default async function GkitAteTarefasPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const context = await requireGkitAteContext(moduleTarget('/modulos/gkit-ate/tarefas', params))
  const [health, formData, tarefas] = await Promise.all([getGkitAteHealth(), getGkitAteFormData(), listGkitAteTarefas()])
  const filters = buildGkitAteTarefaFilters(params)
  const tarefasFiltradas = filterGkitAteTarefas(tarefas, filters)
  const responsavelOptions = Array.from(
    new Set(tarefas.map((tarefa) => tarefa.responsavel).filter(Boolean) as string[]),
  )
    .sort((a, b) => a.localeCompare(b, 'pt-BR'))
    .map((value) => ({ label: value, value }))

  return (
    <GkitAteShell
      active="tarefas"
      title="Tarefas"
      description="Tarefas vinculadas aos atendimentos consultivos."
      usuario={context.usuario}
    >
      <GkitAteHealthNotice health={health} />
      <GkitAteSection title="Tarefas" description={`${tarefasFiltradas.length} de ${tarefas.length} tarefa(s)`}>
        <GkitAteFilterBar
          fields={[
            { label: 'Busca', name: 'q', placeholder: 'Tarefa, cliente, atendimento ou responsável', value: filters.q },
            {
              label: 'Status',
              name: 'status',
              options: [
                { label: 'Pendente', value: 'pendente' },
                { label: 'Em andamento', value: 'em_andamento' },
                { label: 'Concluida', value: 'concluida' },
                { label: 'Cancelada', value: 'cancelada' },
              ],
              placeholder: 'Todos',
              type: 'select',
              value: filters.status,
            },
            {
              label: 'Tipo',
              name: 'tipo',
              options: formData.tarefaTipos.map((tipo) => ({ label: tipo.label, value: tipo.id })),
              placeholder: 'Todos',
              type: 'select',
              value: filters.tipo,
            },
            {
              label: 'Responsável',
              name: 'responsavel',
              options: responsavelOptions,
              placeholder: 'Todos',
              type: 'select',
              value: filters.responsavel,
            },
          ]}
          resetHref="/modulos/gkit-ate/tarefas"
          sort={{
            dir: filters.dir,
            options: [
              { label: 'Data prevista', value: 'data' },
              { label: 'Status', value: 'status' },
              { label: 'Responsável', value: 'responsavel' },
              { label: 'Atendimento', value: 'atendimento' },
            ],
            value: filters.sort,
          }}
        />
        <GkitAteGroupedList
          empty="Nenhuma tarefa encontrada com os filtros atuais."
          hrefForPage={(page) => tarefaHrefForPage(filters, page)}
          itemLabel="tarefa(s)"
          page={filters.pagina}
          rows={tarefaRows(tarefasFiltradas)}
        />
      </GkitAteSection>
    </GkitAteShell>
  )
}
