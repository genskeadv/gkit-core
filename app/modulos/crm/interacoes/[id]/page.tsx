import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { updateCrmInteracaoAction } from '@/features/crm/actions'
import { CrmAtividadeForm, CrmSection, CrmShell } from '@/features/crm/components'
import { getCrmAtividade, getCrmOpportunityFormData, requireCrmContext } from '@/features/crm/queries'

export default async function EditarCrmInteracaoPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireCrmContext()
  if (!canAccess(context.permissions, 'crm.oportunidades.write')) redirect('/modulos/crm/interacoes')

  const { id } = await params
  const [atividade, formData] = await Promise.all([
    getCrmAtividade(id, context),
    getCrmOpportunityFormData(context),
  ])

  return (
    <CrmShell
      active="interacoes"
      eyebrow="Base operacional"
      title={atividade.titulo}
      description="Edite o histórico de relacionamento comercial."
      usuario={context.usuario}
    >
      <CrmSection
        eyebrow="Edição"
        title="Dados da interação"
        description="Atualize o histórico de relacionamento e seus vínculos comerciais."
      >
        <CrmAtividadeForm
          action={updateCrmInteracaoAction}
          atividade={atividade}
          cancelHref="/modulos/crm/interacoes"
          formData={formData}
          submitLabel="Salvar interação"
        />
      </CrmSection>
    </CrmShell>
  )
}
