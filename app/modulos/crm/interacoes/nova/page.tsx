import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { createCrmInteracaoAction } from '@/features/crm/actions'
import { CrmAtividadeForm, CrmSection, CrmShell } from '@/features/crm/components'
import { getCrmOpportunityFormData, requireCrmContext } from '@/features/crm/queries'

export default async function NovaCrmInteracaoPage() {
  const context = await requireCrmContext()
  if (!canAccess(context.permissions, 'crm.oportunidades.write')) redirect('/modulos/crm/interacoes')

  const formData = await getCrmOpportunityFormData(context)

  return (
    <CrmShell
      active="interacoes"
      eyebrow="Base operacional"
      title="Nova interação"
      description="Registre contato, reunião, e-mail ou nota no histórico comercial."
      usuario={context.usuario}
    >
      <CrmSection
        eyebrow="Cadastro"
        title="Dados da interação"
        description="Registre o contato comercial e vincule ao cliente, oportunidade ou contato certo."
      >
        <CrmAtividadeForm
          action={createCrmInteracaoAction}
          cancelHref="/modulos/crm/interacoes"
          formData={formData}
          submitLabel="Salvar interação"
        />
      </CrmSection>
    </CrmShell>
  )
}
