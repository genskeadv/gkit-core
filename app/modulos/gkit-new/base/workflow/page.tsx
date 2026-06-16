import Link from 'next/link'
import { GkitNewHealthNotice, GkitNewList, GkitNewSection, GkitNewShell } from '@/features/gkit-new/components'
import { canWriteGkitNew, getGkitNewHealth, listGkitNewWorkflowModelos, requireGkitNewContext, workflowRows } from '@/features/gkit-new/queries'

export default async function GkitNewWorkflowPage() {
  const context = await requireGkitNewContext()
  const [health, modelos] = await Promise.all([getGkitNewHealth(), listGkitNewWorkflowModelos()])
  const canWrite = canWriteGkitNew(context.permissions, 'gkit_new.workflow.write')

  return (
    <GkitNewShell
      active="workflow"
      title="Workflow"
      description="Modelos de tarefas automaticas criadas ao salvar oportunidades."
      usuario={context.usuario}
      actions={canWrite ? <Link className="button" href="/modulos/gkit-new/base/workflow/novo">Novo modelo</Link> : null}
    >
      <GkitNewHealthNotice health={health} />
      <GkitNewSection title="Modelos de tarefa" description="Cada modelo define descrição, dias e responsável padrão.">
        <GkitNewList
          empty="Nenhum modelo de workflow cadastrado."
          rows={workflowRows(modelos)}
        />
      </GkitNewSection>
    </GkitNewShell>
  )
}
