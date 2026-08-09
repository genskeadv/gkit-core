import Link from 'next/link'
import { canAccess } from '@/lib/auth/permissions'
import { buildCicloListFilters, CicloGenericList, CicloListKpis, CicloSection, CicloShell } from '@/features/ciclo/components'
import { listCicloAdministradoraRows, requireCicloContext } from '@/features/ciclo/queries'

export default async function CicloAdministradorasPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const context = await requireCicloContext()
  const rows = await listCicloAdministradoraRows()
  const canWrite = canAccess(context.permissions, 'ciclo.clientes.write')

  return (
    <CicloShell
      active="administradoras"
      eyebrow="Base cadastral"
      title="Administradoras"
      description="Cadastro de administradoras vinculadas aos clientes do Ciclo."
      usuario={context.usuario}
      actions={canWrite ? <Link className="button" href="/modulos/gkit-ciclo/administradoras/nova">Nova administradora</Link> : null}
    >
      <CicloSection
        eyebrow="Resumo"
        title="Base de administradoras"
        description="Volume e status das administradoras vinculadas aos clientes."
      >
        <CicloListKpis rows={rows} />
      </CicloSection>
      <CicloSection
        eyebrow="Cadastro"
        title="Lista de administradoras"
        description="Administradoras disponíveis para vínculo no cadastro mestre."
      >
        <CicloGenericList
          title="Lista de administradoras"
          description="Administradoras disponíveis no schema Ciclo."
          detailHrefBase="/modulos/gkit-ciclo/administradoras"
          emptyLabel="Nenhuma administradora encontrada."
          filters={buildCicloListFilters(params)}
          rows={rows}
        />
      </CicloSection>
    </CicloShell>
  )
}
