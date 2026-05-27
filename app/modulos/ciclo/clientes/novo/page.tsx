import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { createCicloClienteAction } from '@/features/ciclo/actions'
import { CicloClienteForm, CicloShell } from '@/features/ciclo/components'
import { getCicloClienteFormData, requireCicloContext } from '@/features/ciclo/queries'

export default async function NovoCicloClientePage() {
  const context = await requireCicloContext()
  if (!canAccess(context.permissions, 'ciclo.clientes.write')) redirect('/modulos/ciclo/clientes')

  const formData = await getCicloClienteFormData(context)

  return (
    <CicloShell
      active="clientes"
      eyebrow="Cadastro mestre"
      title="Novo cliente"
      description="Entrada do cliente na esteira operacional do Ciclo, incluindo onboarding."
      usuario={context.usuario}
    >
      <CicloClienteForm action={createCicloClienteAction} formData={formData} />
    </CicloShell>
  )
}
