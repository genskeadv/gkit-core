import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { updateCrmEmpresaAction } from '@/features/crm/actions'
import { CrmEmpresaForm, CrmShell } from '@/features/crm/components'
import { getCrmEmpresa, getCrmOpportunityFormData, requireCrmContext } from '@/features/crm/queries'

export default async function EditarCrmEmpresaPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireCrmContext()
  if (!canAccess(context.permissions, 'crm.oportunidades.write')) redirect('/modulos/crm/empresas')

  const { id } = await params
  const [formData, empresa] = await Promise.all([
    getCrmOpportunityFormData(context),
    getCrmEmpresa(id, context),
  ])

  return (
    <CrmShell
      active="empresas"
      eyebrow="Base cadastral"
      title="Editar empresa"
      description="Atualize conta, carteira, status e informacoes comerciais."
      usuario={context.usuario}
    >
      <CrmEmpresaForm action={updateCrmEmpresaAction} formData={formData} empresa={empresa} />
    </CrmShell>
  )
}
