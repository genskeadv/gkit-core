import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { updateCrmOpportunityAction } from '@/features/crm/actions'
import { CrmOpportunityForm, CrmShell } from '@/features/crm/components'
import { getCrmOpportunity, getCrmOpportunityFormData, requireCrmContext } from '@/features/crm/queries'

export default async function EditarCrmOportunidadePage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireCrmContext()
  if (!canAccess(context.permissions, 'crm.oportunidades.write')) redirect('/modulos/crm/oportunidades')

  const { id } = await params
  const [formData, opportunity] = await Promise.all([
    getCrmOpportunityFormData(context),
    getCrmOpportunity(id, context),
  ])

  return (
    <CrmShell
      active="oportunidades"
      eyebrow="Pipeline comercial"
      title="Editar oportunidade"
      description="Atualize etapa, valor, probabilidade e proximas acoes do pipeline."
      usuario={context.usuario}
    >
      <CrmOpportunityForm action={updateCrmOpportunityAction} formData={formData} opportunity={opportunity} />
    </CrmShell>
  )
}
