import { redirect } from 'next/navigation'
import { updateGkitNewClienteAction } from '@/features/gkit-new/actions'
import { GkitNewClienteForm, GkitNewSection, GkitNewShell } from '@/features/gkit-new/components'
import { canWriteGkitNew, getGkitNewCliente, requireGkitNewContext } from '@/features/gkit-new/queries'

export default async function EditarGkitNewClientePage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireGkitNewContext()
  if (!canWriteGkitNew(context.permissions, 'gkit_new.clientes.write')) redirect('/modulos/gkit-new/clientes')

  const { id } = await params
  const cliente = await getGkitNewCliente(id)

  return (
    <GkitNewShell
      active="clientes"
      title="Editar cliente"
      description="Atualize dados cadastrais sem alterar manualmente o status."
      usuario={context.usuario}
    >
      <GkitNewSection title="Dados do cliente" description="CPF/CNPJ continua sendo a chave unica do cadastro.">
        <GkitNewClienteForm action={updateGkitNewClienteAction} cliente={cliente} />
      </GkitNewSection>
    </GkitNewShell>
  )
}
