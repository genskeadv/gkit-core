import Link from 'next/link'
import { GkitNewHealthNotice, GkitNewList, GkitNewSection, GkitNewShell } from '@/features/gkit-new/components'
import { canWriteGkitNew, contatoRows, getGkitNewHealth, listGkitNewContatos, requireGkitNewContext } from '@/features/gkit-new/queries'

export default async function GkitNewContatosPage() {
  const context = await requireGkitNewContext()
  const [health, contatos] = await Promise.all([getGkitNewHealth(), listGkitNewContatos()])
  const canWrite = canWriteGkitNew(context.permissions, 'gkit_new.contatos.write')

  return (
    <GkitNewShell
      active="contatos"
      title="Contatos"
      description="Pessoas de relacionamento comercial vinculaveis a varios clientes."
      usuario={context.usuario}
      actions={canWrite ? <Link className="button" href="/modulos/gkit-new/contatos/novo">Novo contato</Link> : null}
    >
      <GkitNewHealthNotice health={health} />
      <GkitNewSection title="Base de contatos" description="Contato x cliente em relacao N para N.">
        <GkitNewList
          empty="Nenhum contato cadastrado."
          rows={contatoRows(contatos)}
        />
      </GkitNewSection>
    </GkitNewShell>
  )
}
