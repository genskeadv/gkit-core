import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { createCrmContatoAction } from '@/features/crm/actions'
import { CrmContatoForm, CrmSection, CrmShell } from '@/features/crm/components'
import { getCrmOpportunityFormData, requireCrmContext } from '@/features/crm/queries'

export default async function NovoCrmContatoPage() {
  const context = await requireCrmContext()
  if (!canAccess(context.permissions, 'crm.oportunidades.write')) redirect('/modulos/crm/contatos')
  const formData = await getCrmOpportunityFormData(context)

  return (
    <CrmShell
      active="contatos"
      eyebrow="Base cadastral"
      title="Novo contato"
      description="Cadastre uma pessoa de relacionamento comercial reaproveitavel entre clientes."
      usuario={context.usuario}
    >
      <CrmSection
        eyebrow="Cadastro"
        title="Dados do contato"
        description="Informe nome, cargo, e-mail, telefone, origem e status do relacionamento."
      >
        <CrmContatoForm action={createCrmContatoAction} clientes={formData.empresas} />
      </CrmSection>
    </CrmShell>
  )
}
