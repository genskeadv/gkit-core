import Link from 'next/link'
import { canAccess } from '@/lib/auth/permissions'
import { GkitFatContratosList, GkitFatHealthNotice, GkitFatSection, GkitFatShell } from '@/features/gkit-fat/components'
import { getGkitFatHealth, listGkitFatContratos, requireGkitFatContext } from '@/features/gkit-fat/queries'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function GkitFatContratosPage() {
  const context = await requireGkitFatContext('/modulos/gkit-fat/contratos')
  const [health, contratos] = await Promise.all([
    getGkitFatHealth(),
    listGkitFatContratos(context.usuario),
  ])
  const canWrite = canAccess(context.permissions, 'gkit_fat.contratos.write')

  return (
    <GkitFatShell
      active="contratos"
      actions={canWrite ? <Link className="button" href="/modulos/gkit-fat/contratos/novo">Novo contrato</Link> : null}
      description="Base recorrente e avulsa que alimenta as ordens de servico."
      title="Contratos 03220"
      usuario={context.usuario}
    >
      <GkitFatHealthNotice health={health} />
      <GkitFatSection title="Contratos" description="Cliente e categoria vem do Ciclo; aqui fica a regra de faturamento.">
        <GkitFatContratosList canWrite={canWrite} contratos={contratos} empty="Nenhum contrato cadastrado." />
      </GkitFatSection>
    </GkitFatShell>
  )
}
