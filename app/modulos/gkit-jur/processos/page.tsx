import { GkitJurPlaceholder, GkitJurShell } from '@/features/gkit-jur/components'
import { requireGkitJurContext } from '@/features/gkit-jur/queries'

export default async function GkitJurProcessosRoute() {
  const context = await requireGkitJurContext('/modulos/gkit-jur/processos')

  return (
    <GkitJurShell active="processos" description="Lista e acompanhamento dos processos juridicos." title="Processos" usuario={context.usuario}>
      <GkitJurPlaceholder title="Processos" description="Area reservada para cadastro, triagem e acompanhamento de processos." />
    </GkitJurShell>
  )
}
