import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { GkitFatHealthNotice, GkitFatShell } from '@/features/gkit-fat/components'
import { getGkitFatHealth, requireGkitFatContext } from '@/features/gkit-fat/queries'
import { UberPage } from '@/features/gkit-flex/uber/UberPage'
import { getUberDashboard } from '@/features/gkit-flex/uber/uberPersistence'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function GkitFatUberPage() {
  const context = await requireGkitFatContext('/modulos/gkit-fat/uber')
  if (!canAccess(context.permissions, 'gkit_fat.uber.read')) redirect('/modulos/gkit-fat')

  const [health, data] = await Promise.all([
    getGkitFatHealth(),
    getUberDashboard(),
  ])

  return (
    <GkitFatShell
      active="uber"
      description="Importe vouchers, concilie lancamentos do Colab e acompanhe reembolsos de corridas."
      title="Conciliacao Uber"
      usuario={context.usuario}
    >
      <GkitFatHealthNotice health={health} />
      <UberPage
        apiBasePath="/api/gkit-fat/uber"
        auditHref="/modulos/gkit-fat"
        headerDescription="Selecione a competencia, importe o CSV e trate pendencias de reembolso."
        headerTitle="Competencia Uber"
        initialData={data}
      />
    </GkitFatShell>
  )
}
