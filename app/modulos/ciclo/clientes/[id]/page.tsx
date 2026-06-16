import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { updateCicloClienteAction } from '@/features/ciclo/actions'
import { CicloClienteForm, CicloSection, CicloShell } from '@/features/ciclo/components'
import { getCicloCliente, getCicloClienteFormData, requireCicloContext } from '@/features/ciclo/queries'

export default async function EditarCicloClientePage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireCicloContext()
  if (!canAccess(context.permissions, 'ciclo.clientes.write')) redirect('/modulos/ciclo/clientes')

  const { id } = await params
  const [formData, cliente] = await Promise.all([
    getCicloClienteFormData(context),
    getCicloCliente(id, context),
  ])

  return (
    <CicloShell
      active="clientes"
      eyebrow="Cadastro mestre"
      title="Editar cliente"
      description="Atualize status, risco, regularidade operacional e dados cadastrais."
      usuario={context.usuario}
    >
      <CicloSection
        eyebrow="Edição"
        title="Dados do cliente"
        description="Atualize cadastro, carteira, administradora, risco, score e regularidade."
      >
        <CicloClienteForm action={updateCicloClienteAction} formData={formData} cliente={cliente} />
      </CicloSection>
    </CicloShell>
  )
}
