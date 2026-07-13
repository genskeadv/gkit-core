import { CicloAtendimentoDashboardView, CicloSection, CicloShell } from '@/features/ciclo/components'
import { getCicloAtendimentoDashboard, requireCicloContext } from '@/features/ciclo/queries'
import { moduleTarget } from '@/lib/auth/platform'
import type { CicloAtendimentoStatus, CicloAtendimentoTab } from '@/features/ciclo/types'

type CicloAtendimentoPageProps = {
  searchParams?: Promise<{
    aba?: string
    de?: string
    ate?: string
    status?: string
  }>
}

function activeTab(value?: string): CicloAtendimentoTab {
  if (value === 'responsavel' || value === 'carteira' || value === 'tipo') return value
  return 'cliente'
}

function statusFilter(value?: string): '' | CicloAtendimentoStatus {
  if (value === 'aberto' || value === 'encerrado') return value
  return ''
}

function dateFilter(value?: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value ?? '') ? value : ''
}

export default async function CicloAtendimentoPage({ searchParams }: CicloAtendimentoPageProps) {
  const params = await searchParams
  const context = await requireCicloContext(moduleTarget('/modulos/gkit-ciclo/atendimento', params))
  const tab = activeTab(params?.aba)
  const filters = {
    dataDe: dateFilter(params?.de),
    dataAte: dateFilter(params?.ate),
    status: statusFilter(params?.status),
  }
  const data = await getCicloAtendimentoDashboard(context, filters)

  return (
    <CicloShell
      active="atendimento"
      eyebrow="ASTREA"
      title="Atendimento"
      description="Dashboard consultivo com visões por cliente, responsável, carteira e tipo de atendimento."
      usuario={context.usuario}
    >
      <CicloSection
        eyebrow="Consultivo"
        title="Atendimentos ASTREA"
        description="Filtre por período e status para acompanhar volume, responsáveis, carteiras e etiquetas."
      >
        <CicloAtendimentoDashboardView activeTab={tab} data={data} filters={filters} />
      </CicloSection>
    </CicloShell>
  )
}
