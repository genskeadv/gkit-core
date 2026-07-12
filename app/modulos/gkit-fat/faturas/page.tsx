import { canAccess } from '@/lib/auth/permissions'
import { createGkitFatOrdemServicoAction } from '@/features/gkit-fat/actions'
import { GkitFatHealthNotice, GkitFatOrdemForm, GkitFatOrdensList, GkitFatSection, GkitFatShell } from '@/features/gkit-fat/components'
import { getGkitFatFormData, getGkitFatHealth, listGkitFatOrdens, requireGkitFatContext } from '@/features/gkit-fat/queries'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function GkitFatFaturasPage() {
  const context = await requireGkitFatContext('/modulos/gkit-fat/faturas')
  const [health, formData, ordens] = await Promise.all([
    getGkitFatHealth(),
    getGkitFatFormData(context.usuario),
    listGkitFatOrdens(context.usuario),
  ])
  const canWrite = canAccess(context.permissions, 'gkit_fat.faturas.write')

  return (
    <GkitFatShell
      active="faturas"
      description="Cada OS e uma fotografia do contrato/cliente naquela competencia."
      title="OS e faturas"
      usuario={context.usuario}
    >
      <GkitFatHealthNotice health={health} />
      {canWrite ? (
        <GkitFatSection title="Gerar OS" description="A emissao fiscal fica preparada para conector futuro de NFS-e.">
          <GkitFatOrdemForm action={createGkitFatOrdemServicoAction} formData={formData} />
        </GkitFatSection>
      ) : null}
      <GkitFatSection title="Ordens de servico" description="Situacoes operacional, fiscal e financeira sao controladas separadamente.">
        <GkitFatOrdensList empty="Nenhuma OS gerada." ordens={ordens} />
      </GkitFatSection>
    </GkitFatShell>
  )
}
