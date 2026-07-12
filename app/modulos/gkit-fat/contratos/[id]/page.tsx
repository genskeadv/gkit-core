import { notFound, redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { updateGkitFatContratoAction } from '@/features/gkit-fat/actions'
import { GkitFatContratoForm, GkitFatHealthNotice, GkitFatShell } from '@/features/gkit-fat/components'
import { getGkitFatContrato, getGkitFatFormData, getGkitFatHealth, requireGkitFatContext } from '@/features/gkit-fat/queries'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function EditarGkitFatContratoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const context = await requireGkitFatContext(`/modulos/gkit-fat/contratos/${id}`)
  if (!canAccess(context.permissions, 'gkit_fat.contratos.write')) redirect('/modulos/gkit-fat/contratos')
  const [health, formData, contrato] = await Promise.all([
    getGkitFatHealth(),
    getGkitFatFormData(context.usuario),
    getGkitFatContrato(context.usuario, id),
  ])

  if (!contrato) notFound()

  return (
    <GkitFatShell
      active="contratos"
      description="Edite a regra futura sem alterar OS ja geradas."
      title={contrato.numero}
      usuario={context.usuario}
    >
      <GkitFatHealthNotice health={health} />
      <GkitFatContratoForm action={updateGkitFatContratoAction} contrato={contrato} formData={formData} />
    </GkitFatShell>
  )
}
