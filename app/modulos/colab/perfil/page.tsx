import { ColabIntegrationStatus, ColabProfile, ColabProfileDetails, ColabShell } from '@/features/colab/components'
import { getColabData, requireColabContext } from '@/features/colab/queries'

export default async function ColabPerfilPage() {
  const context = await requireColabContext()
  const data = await getColabData(context.usuario.email)

  return (
    <ColabShell
      active="perfil"
      title={data.collaborator?.name ?? 'Perfil'}
      description="Dados basicos sincronizados a partir do cadastro administrativo."
      usuario={context.usuario}
    >
      <ColabIntegrationStatus data={data} />
      <ColabProfile data={data} />
      <ColabProfileDetails data={data} />
    </ColabShell>
  )
}
