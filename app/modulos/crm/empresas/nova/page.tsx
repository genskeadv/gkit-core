import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { createCrmEmpresaAction } from '@/features/crm/actions'
import { CrmEmpresaForm, CrmSection, CrmShell } from '@/features/crm/components'
import { getCrmOpportunityFormData, requireCrmContext } from '@/features/crm/queries'

export default async function NovaCrmEmpresaPage() {
  const context = await requireCrmContext()
  if (!canAccess(context.permissions, 'crm.oportunidades.write')) redirect('/modulos/crm/clientes')

  const formData = await getCrmOpportunityFormData(context)

  return (
    <CrmShell
      active="clientes"
      eyebrow="Base cadastral"
      title="Novo cliente"
      description="Cadastre um cliente ou prospecto com CNPJ obrigatorio para alimentar contatos e oportunidades."
      usuario={context.usuario}
    >
      <CrmSection
        eyebrow="Cadastro"
        title="Dados do cliente"
        description="Cadastre cliente, CNPJ, carteira, segmento, origem e observacoes comerciais."
      >
        <CrmEmpresaForm action={createCrmEmpresaAction} formData={formData} />
      </CrmSection>
    </CrmShell>
  )
}
