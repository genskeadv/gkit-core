import Link from 'next/link'
import { GkitNewFilterBar, GkitNewHealthNotice, GkitNewList, GkitNewSection, GkitNewShell } from '@/features/gkit-new/components'
import { buildGkitNewWorkflowFilters, filterGkitNewWorkflow } from '@/features/gkit-new/list-filters'
import { canWriteGkitNew, getGkitNewHealth, listGkitNewWorkflowModelos, requireGkitNewContext, workflowRows } from '@/features/gkit-new/queries'
import { moduleTarget } from '@/lib/auth/platform'

export default async function GkitNewWorkflowPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const context = await requireGkitNewContext(moduleTarget('/modulos/gkit-new/base/workflow', params))
  const [health, modelos] = await Promise.all([getGkitNewHealth(), listGkitNewWorkflowModelos()])
  const canWrite = canWriteGkitNew(context.permissions, 'gkit_new.workflow.write')
  const filters = buildGkitNewWorkflowFilters(params)
  const modelosFiltrados = filterGkitNewWorkflow(modelos, filters)
  const responsavelOptions = Array.from(
    new Map(
      modelos
        .filter((modelo) => modelo.responsavel_id)
        .map((modelo) => [modelo.responsavel_id ?? '', modelo.responsavel_nome])
    )
  )
    .sort(([, a], [, b]) => a.localeCompare(b, 'pt-BR'))
    .map(([value, label]) => ({ label, value }))

  return (
    <GkitNewShell
      active="workflow"
      title="Workflow"
      description="Modelos de tarefas automaticas criadas ao salvar oportunidades."
      usuario={context.usuario}
      actions={canWrite ? <Link className="button" href="/modulos/gkit-new/base/workflow/novo">Novo modelo</Link> : null}
    >
      <GkitNewHealthNotice health={health} />
      <GkitNewSection title="Modelos de tarefa" description="Cada modelo define descricao, dias e responsavel padrao.">
        <GkitNewFilterBar
          fields={[
            { label: 'Busca', name: 'q', placeholder: 'Descricao ou responsavel', value: filters.q },
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
            {
              label: 'Responsavel',
              name: 'responsavel',
              options: responsavelOptions,
              placeholder: 'Todos',
              type: 'select',
              value: filters.responsavel,
            },
          ]}
          resetHref="/modulos/gkit-new/base/workflow"
          resultCount={modelosFiltrados.length}
          sort={{
            dir: filters.dir,
            options: [
              { label: 'Ordem', value: 'ordem' },
              { label: 'Dias', value: 'dias' },
              { label: 'Responsavel', value: 'responsavel' },
              { label: 'Descricao', value: 'descricao' },
            ],
            value: filters.sort,
          }}
          totalCount={modelos.length}
        />
        <GkitNewList
          empty="Nenhum modelo encontrado com os filtros atuais."
          rows={workflowRows(modelosFiltrados)}
        />
      </GkitNewSection>
    </GkitNewShell>
  )
}
