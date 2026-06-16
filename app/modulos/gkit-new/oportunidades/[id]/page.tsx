import { redirect } from 'next/navigation'
import { updateGkitNewOportunidadeAction } from '@/features/gkit-new/actions'
import { GkitNewSection, GkitNewShell } from '@/features/gkit-new/components'
import { GkitNewOportunidadeForm } from '@/features/gkit-new/opportunity-form'
import { canWriteGkitNew, getGkitNewFormData, getGkitNewOportunidade, requireGkitNewContext } from '@/features/gkit-new/queries'

export default async function EditarGkitNewOportunidadePage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireGkitNewContext()
  if (!canWriteGkitNew(context.permissions, 'gkit_new.oportunidades.write')) redirect('/modulos/gkit-new/oportunidades')

  const { id } = await params
  const [oportunidade, formData] = await Promise.all([
    getGkitNewOportunidade(id),
    getGkitNewFormData(),
  ])

  return (
    <GkitNewShell
      active="oportunidades"
      title="Editar oportunidade"
      description="Atualize status, valor, escopo e responsável da negociação."
      usuario={context.usuario}
    >
      <GkitNewSection title="Dados da oportunidade" description="Aprovar ou encerrar com tarefas pendentes exige motivo e cancela as pendências.">
        <GkitNewOportunidadeForm action={updateGkitNewOportunidadeAction} formData={formData} oportunidade={oportunidade} />
      </GkitNewSection>
    </GkitNewShell>
  )
}
