import { redirect } from 'next/navigation'
import { createGkitNewClienteAction } from '@/features/gkit-new/actions'
import { GkitNewClienteForm, GkitNewSection, GkitNewShell } from '@/features/gkit-new/components'
import { canWriteGkitNew, requireGkitNewContext } from '@/features/gkit-new/queries'

export default async function NovoGkitNewClientePage() {
  const context = await requireGkitNewContext()
  if (!canWriteGkitNew(context.permissions, 'gkit_new.clientes.write')) redirect('/modulos/gkit-new/clientes')

  return (
    <GkitNewShell
      active="clientes"
      title="Novo cliente"
      description="Cadastre cliente ou prospecto com CPF ou CNPJ obrigatório."
      usuario={context.usuario}
    >
      <GkitNewSection title="Dados do cliente" description="O status será calculado automaticamente pelas oportunidades aprovadas.">
        <GkitNewClienteForm action={createGkitNewClienteAction} />
      </GkitNewSection>
    </GkitNewShell>
  )
}
