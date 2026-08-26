import Link from 'next/link'
import { canAccess } from '@/lib/auth/permissions'
import { buildCicloListFilters, CicloGenericList, CicloListKpis, CicloSection, CicloShell } from '@/features/ciclo/components'
import { listCicloOcorrenciaRows, requireCicloContext } from '@/features/ciclo/queries'

export default async function CicloOcorrenciasPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const context = await requireCicloContext()
  const rows = await listCicloOcorrenciaRows(context)
  const canWrite = canAccess(context.permissions, 'ciclo.alertas.write')

  return (
    <CicloShell
      active="ocorrencias"
      eyebrow="Operação"
      title="Ocorrências"
      description="Registros operacionais que impactam score, risco e rotina dos clientes."
      usuario={context.usuario}
      actions={canWrite ? <Link className="button" href="/modulos/gkit-ciclo/ocorrencias/nova">Nova ocorrência</Link> : null}
    >
      <CicloSection
        className="ciclo-clientes-summary"
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
          description="Ocorrências cadastradas no schema Ciclo."
          detailHrefBase={canWrite ? '/modulos/gkit-ciclo/ocorrencias' : undefined}
          emptyLabel="Nenhuma ocorrência encontrada."
          filters={buildCicloListFilters(params)}
          groupBy="carteira"
          groupItemLabel="ocorrência(s)"
          rows={rows}
        />
      </CicloSection>
    </CicloShell>
  )
}
