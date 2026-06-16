import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { createCrmOpportunityAction } from '@/features/crm/actions'
import { CrmOpportunityForm, CrmSection, CrmShell } from '@/features/crm/components'
import { getCrmOpportunityFormData, requireCrmContext } from '@/features/crm/queries'

export default async function NovaCrmOportunidadePage() {
  const context = await requireCrmContext()
  if (!canAccess(context.permissions, 'crm.oportunidades.write')) redirect('/modulos/crm/oportunidades')

  const formData = await getCrmOpportunityFormData(context)

  return (
    <CrmShell
      active="oportunidades"
      eyebrow="Pipeline comercial"
      title="Nova oportunidade"
      description="Cadastre uma oportunidade vinculada a cliente, carteira, etapa e proxima acao."
      usuario={context.usuario}
    >
      <CrmSection
        eyebrow="Cadastro"
        title="Dados da oportunidade"
        description="Defina conta, contato, etapa, valor, chance e próxima ação comercial."
      >
        <CrmOpportunityForm action={createCrmOpportunityAction} formData={formData} />
      </CrmSection>
    </CrmShell>
  )
}
