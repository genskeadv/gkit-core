import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { createCrmAtividadeAction } from '@/features/crm/actions'
import { CrmAtividadeForm, CrmSection, CrmShell } from '@/features/crm/components'
import { getCrmOpportunityFormData, requireCrmContext } from '@/features/crm/queries'

export default async function NovaCrmAtividadePage() {
  const context = await requireCrmContext()
  if (!canAccess(context.permissions, 'crm.oportunidades.write')) redirect('/modulos/crm/atividades')

  const formData = await getCrmOpportunityFormData(context)

  return (
    <CrmShell
      active="atividades"
      eyebrow="Base operacional"
      title="Nova atividade"
      description="Crie tarefa, reunião, ligação, e-mail ou nota vinculada ao relacionamento comercial."
      usuario={context.usuario}
    >
      <CrmSection
        eyebrow="Cadastro"
        title="Dados da atividade"
        description="Crie uma tarefa, reunião, ligação, e-mail ou nota para a rotina comercial."
      >
        <CrmAtividadeForm action={createCrmAtividadeAction} formData={formData} />
      </CrmSection>
    </CrmShell>
  )
}
