import Link from 'next/link'
import { canAccess } from '@/lib/auth/permissions'
import { CicloGenericList, CicloListKpis, CicloSection, CicloShell } from '@/features/ciclo/components'
import { listCicloOcorrenciaRows, requireCicloContext } from '@/features/ciclo/queries'

export default async function CicloOcorrenciasPage() {
  const context = await requireCicloContext()
  const rows = await listCicloOcorrenciaRows(context)
  const canWrite = canAccess(context.permissions, 'ciclo.alertas.write')

  return (
    <CicloShell
      active="ocorrencias"
      eyebrow="Operação"
      title="Ocorrencias"
      description="Registros operacionais que impactam score, risco e rotina dos clientes."
      usuario={context.usuario}
      actions={canWrite ? <Link className="button" href="/modulos/gkit-ciclo/ocorrencias/nova">Nova ocorrência</Link> : null}
    >
      <CicloSection
        eyebrow="Resumo"
        title="Impactos operacionais"
        description="Volume de ocorrências positivas, em atenção e em risco."
      >
        <CicloListKpis rows={rows} secondaryLabel="Positivas" />
      </CicloSection>
      <CicloSection
        eyebrow="Operação"
        title="Lista de ocorrências"
        description="Registros que impactam score, risco e rotina dos clientes."
      >
        <CicloGenericList
          title="Lista de ocorrências"
          description="Ocorrencias cadastradas no schema Ciclo."
          detailHrefBase={canWrite ? '/modulos/gkit-ciclo/ocorrencias' : undefined}
          emptyLabel="Nenhuma ocorrência encontrada."
          rows={rows}
        />
      </CicloSection>
    </CicloShell>
  )
}
