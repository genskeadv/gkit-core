import { updateCicloAdministradoraAction } from '@/features/ciclo/actions'
import { CicloAdministradoraForm, CicloShell } from '@/features/ciclo/components'
import { getCicloAdministradora, requireCicloContext } from '@/features/ciclo/queries'

export default async function EditarAdministradoraPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireCicloContext()
  const { id } = await params
  const administradora = await getCicloAdministradora(id)

  return (
    <CicloShell
      active="administradoras"
      eyebrow="Base cadastral"
      title={administradora.nome}
      description="Edicao da administradora vinculada aos clientes do Ciclo."
      usuario={context.usuario}
    >
      <CicloAdministradoraForm action={updateCicloAdministradoraAction} administradora={administradora} />
    </CicloShell>
  )
}
