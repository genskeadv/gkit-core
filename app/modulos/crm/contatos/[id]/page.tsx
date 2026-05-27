import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { updateCrmContatoAction } from '@/features/crm/actions'
import { CrmContatoForm, CrmShell } from '@/features/crm/components'
import { getCrmContato, requireCrmContext } from '@/features/crm/queries'

export default async function EditarCrmContatoPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireCrmContext()
  if (!canAccess(context.permissions, 'crm.oportunidades.write')) redirect('/modulos/crm/contatos')

  const { id } = await params
  const contato = await getCrmContato(id)

  return (
    <CrmShell
      active="contatos"
      eyebrow="Base cadastral"
      title="Editar contato"
      description="Atualize dados de relacionamento, cargo, telefone, e-mail e status."
      usuario={context.usuario}
    >
      <CrmContatoForm action={updateCrmContatoAction} contato={contato} />
    </CrmShell>
  )
}
