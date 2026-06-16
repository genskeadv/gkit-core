import Link from 'next/link'
import { canAccess } from '@/lib/auth/permissions'
import { CicloGenericList, CicloListKpis, CicloSection, CicloShell } from '@/features/ciclo/components'
import { listCicloAdministradoraRows, requireCicloContext } from '@/features/ciclo/queries'

export default async function CicloAdministradorasPage() {
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
      actions={canWrite ? <Link className="button" href="/modulos/ciclo/administradoras/nova">Nova administradora</Link> : null}
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
        description="Administradoras disponiveis para vinculo no cadastro mestre."
      >
        <CicloGenericList
          title="Lista de administradoras"
          description="Administradoras disponiveis no schema Ciclo."
          detailHrefBase="/modulos/ciclo/administradoras"
          emptyLabel="Nenhuma administradora encontrada."
          rows={rows}
        />
      </CicloSection>
    </CicloShell>
  )
}
