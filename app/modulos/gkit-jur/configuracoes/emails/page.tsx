import { GkitJurEmailsPage, GkitJurShell } from '@/features/gkit-jur/components'
import { getGkitJurEmailsData, requireGkitJurContext } from '@/features/gkit-jur/queries'

export default async function GkitJurEmailsRoute() {
  const [context, data] = await Promise.all([
    requireGkitJurContext('/modulos/gkit-jur/configuracoes/emails'),
    getGkitJurEmailsData(),
  ])

  return (
    <GkitJurShell
      active="configuracoes"
      description="Fila, historico e registros manuais de e-mails do juridico."
      title="E-mails"
      usuario={context.usuario}
    >
      <GkitJurEmailsPage data={data} />
    </GkitJurShell>
  )
}
