import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { updateCrmPropostaAction } from '@/features/crm/actions'
import { CrmPropostaForm, CrmShell } from '@/features/crm/components'
import { getCrmOpportunityFormData, getCrmProposta, requireCrmContext } from '@/features/crm/queries'

export default async function EditarCrmPropostaPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireCrmContext()
  if (!canAccess(context.permissions, 'crm.propostas.write')) redirect('/modulos/crm/propostas')

  const { id } = await params
  const [formData, proposta] = await Promise.all([
    getCrmOpportunityFormData(context),
    getCrmProposta(id, context),
  ])

  return (
    <CrmShell
      active="propostas"
      eyebrow="Base operacional"
      title="Editar proposta"
      description="Atualize status, valor, validade e observacoes da proposta."
      usuario={context.usuario}
    >
      <CrmPropostaForm action={updateCrmPropostaAction} formData={formData} proposta={proposta} />
    </CrmShell>
  )
}
