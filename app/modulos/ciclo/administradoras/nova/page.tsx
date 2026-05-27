import { createCicloAdministradoraAction } from '@/features/ciclo/actions'
import { CicloAdministradoraForm, CicloShell } from '@/features/ciclo/components'
import { requireCicloContext } from '@/features/ciclo/queries'

export default async function NovaAdministradoraPage() {
  const context = await requireCicloContext()

  return (
    <CicloShell
      active="administradoras"
      eyebrow="Base cadastral"
      title="Nova administradora"
      description="Cadastro da administradora usada no relacionamento operacional dos clientes."
      usuario={context.usuario}
    >
      <CicloAdministradoraForm action={createCicloAdministradoraAction} />
    </CicloShell>
  )
}
