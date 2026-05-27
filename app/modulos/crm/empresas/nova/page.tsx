import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { createCrmEmpresaAction } from '@/features/crm/actions'
import { CrmEmpresaForm, CrmShell } from '@/features/crm/components'
import { getCrmOpportunityFormData, requireCrmContext } from '@/features/crm/queries'

export default async function NovaCrmEmpresaPage() {
  const context = await requireCrmContext()
  if (!canAccess(context.permissions, 'crm.oportunidades.write')) redirect('/modulos/crm/empresas')

  const formData = await getCrmOpportunityFormData(context)

  return (
    <CrmShell
      active="empresas"
      eyebrow="Base cadastral"
      title="Nova empresa"
      description="Cadastre uma conta comercial para alimentar contatos e oportunidades."
      usuario={context.usuario}
    >
      <CrmEmpresaForm action={createCrmEmpresaAction} formData={formData} />
    </CrmShell>
  )
}
