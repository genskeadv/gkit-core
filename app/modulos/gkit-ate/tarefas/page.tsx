import { GkitAteFilterBar, GkitAteHealthNotice, GkitAteList, GkitAteSection, GkitAteShell } from '@/features/gkit-ate/components'
import { buildGkitAteTarefaFilters, filterGkitAteTarefas } from '@/features/gkit-ate/list-filters'
import { getGkitAteFormData, getGkitAteHealth, listGkitAteTarefas, requireGkitAteContext, tarefaRows } from '@/features/gkit-ate/queries'
import { moduleTarget } from '@/lib/auth/platform'

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
      <GkitAteSection title="Lista de tarefas" description="Consulte tarefas por status, tipo, responsavel e atendimento.">
        <GkitAteFilterBar
          fields={[
            { label: 'Busca', name: 'q', placeholder: 'Tarefa, cliente, atendimento ou responsavel', value: filters.q },
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
              label: 'Responsavel',
              name: 'responsavel',
              options: responsavelOptions,
              placeholder: 'Todos',
              type: 'select',
              value: filters.responsavel,
            },
          ]}
          resetHref="/modulos/gkit-ate/tarefas"
          resultCount={tarefasFiltradas.length}
          sort={{
            dir: filters.dir,
            options: [
              { label: 'Data prevista', value: 'data' },
              { label: 'Status', value: 'status' },
              { label: 'Responsavel', value: 'responsavel' },
              { label: 'Atendimento', value: 'atendimento' },
            ],
            value: filters.sort,
          }}
          totalCount={tarefas.length}
        />
        <GkitAteList empty="Nenhuma tarefa encontrada com os filtros atuais." rows={tarefaRows(tarefasFiltradas)} />
      </GkitAteSection>
    </GkitAteShell>
  )
}
