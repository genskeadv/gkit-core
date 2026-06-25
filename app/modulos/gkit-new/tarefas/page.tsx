import { GkitNewFilterBar, GkitNewHealthNotice, GkitNewList, GkitNewSection, GkitNewShell } from '@/features/gkit-new/components'
import { buildGkitNewTarefaFilters, filterGkitNewTarefas } from '@/features/gkit-new/list-filters'
import { getGkitNewHealth, listGkitNewTarefas, requireGkitNewContext, tarefaRows } from '@/features/gkit-new/queries'
import { moduleTarget } from '@/lib/auth/platform'

export default async function GkitNewTarefasPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const context = await requireGkitNewContext(moduleTarget('/modulos/gkit-new/tarefas', params))
  const [health, tarefas] = await Promise.all([getGkitNewHealth(), listGkitNewTarefas()])
  const filters = buildGkitNewTarefaFilters(params)
  const tarefasFiltradas = filterGkitNewTarefas(tarefas, filters)
  const responsavelOptions = Array.from(
    new Map(
      tarefas
        .filter((tarefa) => tarefa.responsavel_id)
        .map((tarefa) => [tarefa.responsavel_id ?? '', tarefa.responsavel_nome])
    )
  )
    .sort(([, a], [, b]) => a.localeCompare(b, 'pt-BR'))
    .map(([value, label]) => ({ label, value }))

  return (
    <GkitNewShell
      active="tarefas"
      title="Tarefas"
      description="Acompanhamento de tarefas geradas pelo workflow das oportunidades."
      usuario={context.usuario}
    >
      <GkitNewHealthNotice health={health} />
      <GkitNewSection title="Tarefas do workflow" description="Pendentes podem ser concluidas pelo operador ou canceladas por encerramento antecipado.">
        <GkitNewFilterBar
          fields={[
            { label: 'Busca', name: 'q', placeholder: 'Tarefa, cliente, oportunidade ou responsavel', value: filters.q },
            {
              label: 'Status',
              name: 'status',
              options: [
                { label: 'Pendente', value: 'pendente' },
                { label: 'Concluida', value: 'concluida' },
                { label: 'Cancelada', value: 'cancelada' },
              ],
              placeholder: 'Todos',
              type: 'select',
              value: filters.status,
            },
            {
              label: 'Responsavel',
              name: 'responsavel',
              options: responsavelOptions,
              placeholder: 'Todos',
              type: 'select',
              value: filters.responsavel,
            },
          ]}
          resetHref="/modulos/gkit-new/tarefas"
          resultCount={tarefasFiltradas.length}
          sort={{
            dir: filters.dir,
            options: [
              { label: 'Data prevista', value: 'data' },
              { label: 'Status', value: 'status' },
              { label: 'Responsavel', value: 'responsavel' },
              { label: 'Cliente', value: 'cliente' },
            ],
            value: filters.sort,
          }}
          totalCount={tarefas.length}
        />
        <GkitNewList empty="Nenhuma tarefa encontrada com os filtros atuais." rows={tarefaRows(tarefasFiltradas)} />
      </GkitNewSection>
    </GkitNewShell>
  )
}
