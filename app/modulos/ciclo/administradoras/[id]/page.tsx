import { updateCicloAdministradoraAction } from '@/features/ciclo/actions'
import { CicloAdministradoraForm, CicloSection, CicloShell } from '@/features/ciclo/components'
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
      description="Edição da administradora vinculada aos clientes do Ciclo."
      usuario={context.usuario}
    >
      <CicloSection
        eyebrow="Edição"
        title="Dados da administradora"
        description="Atualize cadastro, contato e observações operacionais."
      >
        <CicloAdministradoraForm action={updateCicloAdministradoraAction} administradora={administradora} />
      </CicloSection>
    </CicloShell>
  )
}
