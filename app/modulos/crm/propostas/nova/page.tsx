import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { createCrmPropostaAction } from '@/features/crm/actions'
import { CrmPropostaForm, CrmSection, CrmShell } from '@/features/crm/components'
import { getCrmOpportunityFormData, requireCrmContext } from '@/features/crm/queries'

export default async function NovaCrmPropostaPage() {
  const context = await requireCrmContext()
  if (!canAccess(context.permissions, 'crm.propostas.write')) redirect('/modulos/crm/propostas')

  const formData = await getCrmOpportunityFormData(context)

  return (
    <CrmShell
      active="propostas"
      eyebrow="Base operacional"
      title="Nova proposta"
      description="Crie uma proposta vinculada a oportunidade, carteira, valor e validade."
      usuario={context.usuario}
    >
      <CrmSection
        eyebrow="Cadastro"
        title="Dados da proposta"
        description="Vincule oportunidade, carteira, valor, validade e status inicial."
      >
        <CrmPropostaForm action={createCrmPropostaAction} formData={formData} />
      </CrmSection>
    </CrmShell>
  )
}
