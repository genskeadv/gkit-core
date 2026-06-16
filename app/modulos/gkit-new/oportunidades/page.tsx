import Link from 'next/link'
import { GkitNewHealthNotice, GkitNewList, GkitNewSection, GkitNewShell } from '@/features/gkit-new/components'
import { canWriteGkitNew, getGkitNewHealth, listGkitNewOportunidades, oportunidadeRows, requireGkitNewContext } from '@/features/gkit-new/queries'

export default async function GkitNewOportunidadesPage() {
  const context = await requireGkitNewContext()
  const [health, oportunidades] = await Promise.all([getGkitNewHealth(), listGkitNewOportunidades()])
  const canWrite = canWriteGkitNew(context.permissions, 'gkit_new.oportunidades.write')

  return (
    <GkitNewShell
      active="oportunidades"
      title="Oportunidades"
      description="Negociações comerciais com workflow automático de tarefas."
      usuario={context.usuario}
      actions={canWrite ? <Link className="button" href="/modulos/gkit-new/oportunidades/novo">Nova oportunidade</Link> : null}
    >
      <GkitNewHealthNotice health={health} />
      <GkitNewSection title="Pipeline operacional" description="Aprovada ativa o cliente; encerrada finaliza a negociação.">
        <GkitNewList
          empty="Nenhuma oportunidade cadastrada."
          rows={oportunidadeRows(oportunidades)}
        />
      </GkitNewSection>
    </GkitNewShell>
  )
}
