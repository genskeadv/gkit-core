import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { updateCrmEmpresaAction } from '@/features/crm/actions'
import { CrmEmpresaForm, CrmSection, CrmShell } from '@/features/crm/components'
import { getCrmEmpresa, getCrmOpportunityFormData, requireCrmContext } from '@/features/crm/queries'

export default async function EditarCrmEmpresaPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireCrmContext()
  if (!canAccess(context.permissions, 'crm.oportunidades.write')) redirect('/modulos/crm/clientes')

  const { id } = await params
  const [formData, empresa] = await Promise.all([
    getCrmOpportunityFormData(context),
    getCrmEmpresa(id, context),
  ])

  return (
    <CrmShell
      active="clientes"
      eyebrow="Base cadastral"
      title="Editar cliente"
      description="Atualize cliente, CNPJ, carteira e informacoes comerciais."
      usuario={context.usuario}
    >
      <CrmSection
        eyebrow="Edicao"
        title="Dados do cliente"
        description="Atualize cliente, CNPJ, carteira e informacoes comerciais."
      >
        <CrmEmpresaForm action={updateCrmEmpresaAction} formData={formData} empresa={empresa} />
      </CrmSection>
    </CrmShell>
  )
}
