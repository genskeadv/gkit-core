import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { updateCrmAtividadeAction } from '@/features/crm/actions'
import { CrmAtividadeForm, CrmShell } from '@/features/crm/components'
import { getCrmAtividade, getCrmOpportunityFormData, requireCrmContext } from '@/features/crm/queries'

export default async function EditarCrmAtividadePage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireCrmContext()
  if (!canAccess(context.permissions, 'crm.oportunidades.write')) redirect('/modulos/crm/atividades')

  const { id } = await params
  const [formData, atividade] = await Promise.all([
    getCrmOpportunityFormData(context),
    getCrmAtividade(id, context),
  ])

  return (
    <CrmShell
      active="atividades"
      eyebrow="Base operacional"
      title="Editar atividade"
      description="Atualize prazo, conclusao e relacionamento da atividade comercial."
      usuario={context.usuario}
    >
      <CrmAtividadeForm action={updateCrmAtividadeAction} formData={formData} atividade={atividade} />
    </CrmShell>
  )
}
