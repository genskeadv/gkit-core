import { redirect } from 'next/navigation'
import { createGkitNewContatoAction } from '@/features/gkit-new/actions'
import { GkitNewContatoForm, GkitNewSection, GkitNewShell } from '@/features/gkit-new/components'
import { canWriteGkitNew, getGkitNewFormData, requireGkitNewContext } from '@/features/gkit-new/queries'

export default async function NovoGkitNewContatoPage() {
  const context = await requireGkitNewContext()
  if (!canWriteGkitNew(context.permissions, 'gkit_new.contatos.write')) redirect('/modulos/gkit-new/contatos')

  const formData = await getGkitNewFormData()

  return (
    <GkitNewShell
      active="contatos"
      title="Novo contato"
      description="Cadastre a pessoa de relacionamento e vincule aos clientes."
      usuario={context.usuario}
    >
      <GkitNewSection title="Dados do contato" description="O mesmo contato pode atender mais de um cliente.">
        <GkitNewContatoForm action={createGkitNewContatoAction} clientes={formData.clientes} />
      </GkitNewSection>
    </GkitNewShell>
  )
}
