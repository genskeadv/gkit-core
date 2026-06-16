import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { updateCrmContatoAction } from '@/features/crm/actions'
import { CrmContatoForm, CrmSection, CrmShell } from '@/features/crm/components'
import { getCrmContato, getCrmOpportunityFormData, requireCrmContext } from '@/features/crm/queries'

export default async function EditarCrmContatoPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireCrmContext()
  if (!canAccess(context.permissions, 'crm.oportunidades.write')) redirect('/modulos/crm/contatos')

  const { id } = await params
  const [contato, formData] = await Promise.all([
    getCrmContato(id),
    getCrmOpportunityFormData(context),
  ])

  return (
    <CrmShell
      active="contatos"
      eyebrow="Base cadastral"
      title="Editar contato"
      description="Atualize dados de relacionamento, cargo, telefone, e-mail e status."
      usuario={context.usuario}
    >
      <CrmSection
        eyebrow="Edição"
        title="Dados do contato"
        description="Atualize dados de relacionamento, cargo, telefone, e-mail e status."
      >
        <CrmContatoForm action={updateCrmContatoAction} clientes={formData.empresas} contato={contato} />
      </CrmSection>
    </CrmShell>
  )
}
