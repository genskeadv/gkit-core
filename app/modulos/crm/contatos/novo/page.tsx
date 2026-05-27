import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { createCrmContatoAction } from '@/features/crm/actions'
import { CrmContatoForm, CrmShell } from '@/features/crm/components'
import { requireCrmContext } from '@/features/crm/queries'

export default async function NovoCrmContatoPage() {
  const context = await requireCrmContext()
  if (!canAccess(context.permissions, 'crm.oportunidades.write')) redirect('/modulos/crm/contatos')

  return (
    <CrmShell
      active="contatos"
      eyebrow="Base cadastral"
      title="Novo contato"
      description="Cadastre uma pessoa de relacionamento comercial reaproveitavel entre empresas."
      usuario={context.usuario}
    >
      <CrmContatoForm action={createCrmContatoAction} />
    </CrmShell>
  )
}
