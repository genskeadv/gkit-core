import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { createGkitFatContratoAction } from '@/features/gkit-fat/actions'
import { GkitFatContratoForm, GkitFatHealthNotice, GkitFatShell } from '@/features/gkit-fat/components'
import { getGkitFatFormData, getGkitFatHealth, requireGkitFatContext } from '@/features/gkit-fat/queries'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function NovoGkitFatContratoPage() {
  const context = await requireGkitFatContext('/modulos/gkit-fat/contratos/novo')
  if (!canAccess(context.permissions, 'gkit_fat.contratos.write')) redirect('/modulos/gkit-fat/contratos')
  const [health, formData] = await Promise.all([
    getGkitFatHealth(),
    getGkitFatFormData(context.usuario),
  ])

  return (
    <GkitFatShell
      active="contratos"
      description="Crie a matriz de faturamento que depois gera OS por competencia."
      title="Novo contrato"
      usuario={context.usuario}
    >
      <GkitFatHealthNotice health={health} />
      <GkitFatContratoForm action={createGkitFatContratoAction} formData={formData} />
    </GkitFatShell>
  )
}
