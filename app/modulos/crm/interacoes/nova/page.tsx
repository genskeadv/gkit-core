import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { createCrmInteracaoAction } from '@/features/crm/actions'
import { CrmAtividadeForm, CrmShell } from '@/features/crm/components'
import { getCrmOpportunityFormData, requireCrmContext } from '@/features/crm/queries'

export default async function NovaCrmInteracaoPage() {
  const context = await requireCrmContext()
  if (!canAccess(context.permissions, 'crm.oportunidades.write')) redirect('/modulos/crm/interacoes')

  const formData = await getCrmOpportunityFormData(context)

  return (
    <CrmShell
      active="interacoes"
      eyebrow="Base operacional"
      title="Nova interacao"
      description="Registre contato, reuniao, e-mail ou nota no historico comercial."
      usuario={context.usuario}
    >
      <CrmAtividadeForm
        action={createCrmInteracaoAction}
        cancelHref="/modulos/crm/interacoes"
        formData={formData}
        submitLabel="Salvar interacao"
      />
    </CrmShell>
  )
}
