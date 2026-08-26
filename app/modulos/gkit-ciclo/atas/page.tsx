import Link from 'next/link'
import { canAccess } from '@/lib/auth/permissions'
import { buildCicloListFilters, CicloGenericList, CicloListKpis, CicloSection, CicloShell } from '@/features/ciclo/components'
import { listCicloAtaRows, requireCicloContext } from '@/features/ciclo/queries'

export default async function CicloAtasPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const context = await requireCicloContext()
  const rows = await listCicloAtaRows(context)
  const canWrite = canAccess(context.permissions, 'ciclo.clientes.write')

  return (
    <CicloShell
      active="atas"
      eyebrow="Documentos"
      title="Atas"
      description="Atas, assembleias, validade e observações operacionais."
      usuario={context.usuario}
      actions={canWrite ? <Link className="button" href="/modulos/gkit-ciclo/atas/nova">Nova ata</Link> : null}
    >
      <CicloSection
        eyebrow="Resumo"
        title="Atas da carteira"
        description="Volume e vigência das atas vinculadas aos clientes."
      >
        <CicloListKpis rows={rows} secondaryLabel="Vigentes" />
      </CicloSection>
      <CicloSection
        eyebrow="Documentos"
        hideHeader
        title="Lista de atas"
        description="Atas, assembleias, validade e observações operacionais."
      >
        <CicloGenericList
          title="Lista de atas"
          description="Atas cadastradas no schema Ciclo."
          detailHrefBase={canWrite ? '/modulos/gkit-ciclo/atas' : undefined}
          emptyLabel="Nenhuma ata encontrada."
          filters={buildCicloListFilters(params)}
          groupByCliente
          rows={rows}
        />
      </CicloSection>
    </CicloShell>
  )
}
