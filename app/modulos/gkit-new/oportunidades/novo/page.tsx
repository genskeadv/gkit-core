import { redirect } from 'next/navigation'
import { createGkitNewOportunidadeAction } from '@/features/gkit-new/actions'
import { GkitNewSection, GkitNewShell } from '@/features/gkit-new/components'
import { GkitNewOportunidadeForm } from '@/features/gkit-new/opportunity-form'
import { canWriteGkitNew, getGkitNewFormData, requireGkitNewContext } from '@/features/gkit-new/queries'

export default async function NovaGkitNewOportunidadePage() {
  const context = await requireGkitNewContext()
  if (!canWriteGkitNew(context.permissions, 'gkit_new.oportunidades.write')) redirect('/modulos/gkit-new/oportunidades')

  const formData = await getGkitNewFormData()

  return (
    <GkitNewShell
      active="oportunidades"
      title="Nova oportunidade"
      description="Cadastre negociação vinculada a cliente e contato."
      usuario={context.usuario}
    >
      <GkitNewSection title="Dados da oportunidade" description="O contato precisa estar vinculado ao cliente selecionado.">
        <GkitNewOportunidadeForm action={createGkitNewOportunidadeAction} formData={formData} />
      </GkitNewSection>
    </GkitNewShell>
  )
}
