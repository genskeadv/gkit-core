import { GkitJurPlaceholder, GkitJurShell } from '@/features/gkit-jur/components'
import { requireGkitJurContext } from '@/features/gkit-jur/queries'

export default async function GkitJurPrazosRoute() {
  const context = await requireGkitJurContext('/modulos/gkit-jur/prazos')

  return (
    <GkitJurShell active="prazos" description="Controle operacional de prazos e vencimentos." title="Prazos" usuario={context.usuario}>
      <GkitJurPlaceholder title="Prazos" description="Area reservada para vencimentos, responsaveis, alertas e status de cumprimento." />
    </GkitJurShell>
  )
}
