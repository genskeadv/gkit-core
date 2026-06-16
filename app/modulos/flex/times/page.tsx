import { canAccess } from '@/lib/auth/permissions'
import { FlexList, FlexSection, FlexShell } from '@/features/flex/components'
import { listFlexTimes, requireFlexContext } from '@/features/flex/queries'

export default async function FlexTimesPage() {
  const context = await requireFlexContext()
  const rows = await listFlexTimes()
  const canWrite = canAccess(context.permissions, 'flex.colaboradores.write')

  return (
    <FlexShell
      active="times"
      title="Times"
      description="Equipes operacionais usadas por colaboradores, rateios e leituras futuras."
      usuario={context.usuario}
    >
      <FlexSection eyebrow="Equipes" title="Times Flex" description="Agrupamentos operacionais para leitura, rateios e gestão.">
        <FlexList canWrite={canWrite} createHref="/modulos/flex/times/novo" empty="Nenhum time cadastrado." rows={rows} />
      </FlexSection>
    </FlexShell>
  )
}
