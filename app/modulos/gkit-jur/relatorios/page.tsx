import { GkitJurPlaceholder, GkitJurShell } from '@/features/gkit-jur/components'
import { requireGkitJurContext } from '@/features/gkit-jur/queries'

export default async function GkitJurRelatoriosRoute() {
  const context = await requireGkitJurContext('/modulos/gkit-jur/relatorios')

  return (
    <GkitJurShell active="relatorios" description="Relatorios gerenciais do modulo juridico." title="Relatorios" usuario={context.usuario}>
      <GkitJurPlaceholder title="Relatorios" description="Area reservada para indicadores, produtividade e acompanhamento executivo." />
    </GkitJurShell>
  )
}
