import { GkitAteAtendimentoDashboard, GkitAteSection, GkitAteShell } from '@/features/gkit-ate/components'
import { getGkitAteAtendimentoDashboard, requireGkitAteContext } from '@/features/gkit-ate/queries'
import { moduleTarget } from '@/lib/auth/platform'
import type { GkitAteDashboardTab, GkitAteStatus } from '@/features/gkit-ate/types'

type GkitAteDashboardPageProps = {
  searchParams?: Promise<{
    aba?: string
    de?: string
    ate?: string
    status?: string
  }>
}

function activeTab(value?: string): GkitAteDashboardTab {
  if (value === 'responsavel' || value === 'carteira' || value === 'tipo') return value
  return 'cliente'
}

function statusFilter(value?: string): '' | GkitAteStatus {
  if (value === 'aberto' || value === 'encerrado') return value
  return ''
}

function dateFilter(value?: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value ?? '') ? value : ''
}

export default async function GkitAteDashboardPage({ searchParams }: GkitAteDashboardPageProps) {
  const params = await searchParams
  const context = await requireGkitAteContext(moduleTarget('/modulos/gkit-ate/dashboard', params))
  const tab = activeTab(params?.aba)
  const filters = {
    dataDe: dateFilter(params?.de),
    dataAte: dateFilter(params?.ate),
    status: statusFilter(params?.status),
  }
  const data = await getGkitAteAtendimentoDashboard(filters)

  return (
    <GkitAteShell
      active="dashboard"
      title="Dashboard"
      description="Dashboard consultivo com visões por cliente, responsável, carteira e tipo de atendimento."
      usuario={context.usuario}
    >
      <GkitAteSection
        title="Atendimentos"
        description={`${data.kpis.total} atendimento(s) no filtro atual`}
      >
        <GkitAteAtendimentoDashboard activeTab={tab} data={data} filters={filters} />
      </GkitAteSection>
    </GkitAteShell>
  )
}
