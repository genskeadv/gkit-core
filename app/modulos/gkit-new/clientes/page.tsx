import Link from 'next/link'
import { GkitNewHealthNotice, GkitNewList, GkitNewSection, GkitNewShell } from '@/features/gkit-new/components'
import { canWriteGkitNew, clienteRows, getGkitNewHealth, listGkitNewClientes, requireGkitNewContext } from '@/features/gkit-new/queries'

export default async function GkitNewClientesPage() {
  const context = await requireGkitNewContext()
  const [health, clientes] = await Promise.all([getGkitNewHealth(), listGkitNewClientes()])
  const canWrite = canWriteGkitNew(context.permissions, 'gkit_new.clientes.write')

  return (
    <GkitNewShell
      active="clientes"
      title="Clientes"
      description="Base única de clientes e prospectos com CPF ou CNPJ obrigatório."
      usuario={context.usuario}
      actions={canWrite ? <Link className="button" href="/modulos/gkit-new/clientes/novo">Novo cliente</Link> : null}
    >
      <GkitNewHealthNotice health={health} />
      <GkitNewSection title="Base de clientes" description="Status derivado automaticamente por oportunidade aprovada.">
        <GkitNewList
          empty="Nenhum cliente cadastrado."
          rows={clienteRows(clientes)}
        />
      </GkitNewSection>
    </GkitNewShell>
  )
}
