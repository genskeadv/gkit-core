import { redirect } from 'next/navigation'
import { updateGkitNewContatoAction } from '@/features/gkit-new/actions'
import { GkitNewContatoForm, GkitNewSection, GkitNewShell } from '@/features/gkit-new/components'
import { canWriteGkitNew, getGkitNewContato, getGkitNewFormData, requireGkitNewContext } from '@/features/gkit-new/queries'

export default async function EditarGkitNewContatoPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireGkitNewContext()
  if (!canWriteGkitNew(context.permissions, 'gkit_new.contatos.write')) redirect('/modulos/gkit-new/contatos')

  const { id } = await params
  const [contato, formData] = await Promise.all([
    getGkitNewContato(id),
    getGkitNewFormData(),
  ])

  return (
    <GkitNewShell
      active="contatos"
      title="Editar contato"
      description="Atualize dados e vinculos do contato com clientes."
      usuario={context.usuario}
    >
      <GkitNewSection title="Dados do contato" description="Os vinculos podem ser alterados sem duplicar o contato.">
        <GkitNewContatoForm action={updateGkitNewContatoAction} clientes={formData.clientes} contato={contato} />
      </GkitNewSection>
    </GkitNewShell>
  )
}
