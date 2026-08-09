import { redirect } from 'next/navigation'
import { updateGkitNewOportunidadeAction, updateGkitNewOportunidadeQuickStatusAction } from '@/features/gkit-new/actions'
import { GkitNewOportunidadeDetailPanel, GkitNewSection, GkitNewShell } from '@/features/gkit-new/components'
import { GkitNewOportunidadeForm } from '@/features/gkit-new/opportunity-form'
import { canWriteGkitNew, getGkitNewFormData, getGkitNewOportunidadeDetail, requireGkitNewContext } from '@/features/gkit-new/queries'

export default async function EditarGkitNewOportunidadePage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireGkitNewContext()
  if (!canWriteGkitNew(context.permissions, 'gkit_new.oportunidades.write')) redirect('/modulos/gkit-new/oportunidades')

  const { id } = await params
  const [oportunidade, formData] = await Promise.all([
    getGkitNewOportunidadeDetail(id),
    getGkitNewFormData(),
  ])
  const canWrite = canWriteGkitNew(context.permissions, 'gkit_new.oportunidades.write')

  return (
    <GkitNewShell
      active="oportunidades"
      title="Detalhe da oportunidade"
      description="Resumo comercial, tarefas de workflow, historico e ajuste fino da negociacao."
      usuario={context.usuario}
    >
      <GkitNewOportunidadeDetailPanel
        canWrite={canWrite}
        oportunidade={oportunidade}
        statusAction={updateGkitNewOportunidadeQuickStatusAction}
      />
      <GkitNewSection title="Editar dados" description="Aprovar ou encerrar com tarefas pendentes exige motivo e cancela as pendencias.">
        <GkitNewOportunidadeForm action={updateGkitNewOportunidadeAction} formData={formData} oportunidade={oportunidade} />
      </GkitNewSection>
    </GkitNewShell>
  )
}
