import { GkitFatDashboard, GkitFatHealthNotice, GkitFatShell } from '@/features/gkit-fat/components'
import { getGkitFatDashboard, getGkitFatHealth, requireGkitFatContext } from '@/features/gkit-fat/queries'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function GkitFatPage() {
  const context = await requireGkitFatContext('/modulos/gkit-fat')
  const [health, data] = await Promise.all([
    getGkitFatHealth(),
    getGkitFatDashboard(context.usuario),
  ])

  return (
    <GkitFatShell
      active="cockpit"
      description="Contratos, OS e preparo de NFS-e para servicos advocaticios 03220."
      title="Faturamento de servicos"
      usuario={context.usuario}
    >
      <GkitFatHealthNotice health={health} />
      <GkitFatDashboard data={data} />
    </GkitFatShell>
  )
}
