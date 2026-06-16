import Link from 'next/link'
import { canAccess } from '@/lib/auth/permissions'
import { CicloAlertList, CicloKpis, CicloSection, CicloShell } from '@/features/ciclo/components'
import { getCicloData, requireCicloContext } from '@/features/ciclo/queries'

export default async function CicloAlertasPage() {
  const context = await requireCicloContext()
  const data = await getCicloData(context)
  const canWrite = canAccess(context.permissions, 'ciclo.alertas.write')

  return (
    <CicloShell
      active="alertas"
      eyebrow="Fila operacional"
      title="Alertas"
      description="Pontos de atenção por cliente: documentos, ocorrências, risco e prazos."
      usuario={context.usuario}
      actions={canWrite ? <Link className="button" href="/modulos/ciclo/alertas/novo">Novo alerta</Link> : null}
    >
      <CicloSection
        eyebrow="Resumo"
        title="Fila de risco"
        description="Contexto geral da carteira antes de tratar os alertas abertos."
      >
        <CicloKpis data={data} />
      </CicloSection>
      <CicloSection
        eyebrow="Operação"
        title="Alertas recentes"
        description="Riscos operacionais, documentação e acompanhamentos em aberto."
      >
        <CicloAlertList alertas={data.alertas} canWrite={canWrite} />
      </CicloSection>
    </CicloShell>
  )
}
