import { redirect } from 'next/navigation'
import { updateGkitNewWorkflowAction } from '@/features/gkit-new/actions'
import { GkitNewSection, GkitNewShell, GkitNewWorkflowForm } from '@/features/gkit-new/components'
import { canWriteGkitNew, getGkitNewFormData, getGkitNewWorkflowModelo, requireGkitNewContext } from '@/features/gkit-new/queries'

export default async function EditarGkitNewWorkflowPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireGkitNewContext()
  if (!canWriteGkitNew(context.permissions, 'gkit_new.workflow.write')) redirect('/modulos/gkit-new/base/workflow')

  const { id } = await params
  const [modelo, formData] = await Promise.all([
    getGkitNewWorkflowModelo(id),
    getGkitNewFormData(),
  ])

  return (
    <GkitNewShell
      active="workflow"
      title="Editar modelo"
      description="Atualize descrição, dias, responsável e status do modelo."
      usuario={context.usuario}
    >
      <GkitNewSection title="Modelo de tarefa" description="Alteracoes valem para novas oportunidades.">
        <GkitNewWorkflowForm action={updateGkitNewWorkflowAction} formData={formData} modelo={modelo} />
      </GkitNewSection>
    </GkitNewShell>
  )
}
