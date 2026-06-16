import { redirect } from 'next/navigation'
import { createGkitNewWorkflowAction } from '@/features/gkit-new/actions'
import { GkitNewSection, GkitNewShell, GkitNewWorkflowForm } from '@/features/gkit-new/components'
import { canWriteGkitNew, getGkitNewFormData, requireGkitNewContext } from '@/features/gkit-new/queries'

export default async function NovoGkitNewWorkflowPage() {
  const context = await requireGkitNewContext()
  if (!canWriteGkitNew(context.permissions, 'gkit_new.workflow.write')) redirect('/modulos/gkit-new/base/workflow')

  const formData = await getGkitNewFormData()

  return (
    <GkitNewShell
      active="workflow"
      title="Novo modelo"
      description="Configure tarefa automatica para oportunidades futuras."
      usuario={context.usuario}
    >
      <GkitNewSection title="Modelo de tarefa" description="A data prevista usa a criacao da oportunidade mais o numero de dias.">
        <GkitNewWorkflowForm action={createGkitNewWorkflowAction} formData={formData} />
      </GkitNewSection>
    </GkitNewShell>
  )
}
