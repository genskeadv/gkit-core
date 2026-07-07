import { GkitJurMovimentacoesPage, GkitJurShell } from '@/features/gkit-jur/components'
import { buildGkitJurMovimentacaoFilters, listGkitJurMovimentacoes, requireGkitJurContext } from '@/features/gkit-jur/queries'
import { moduleTarget, type ModuleSearchParams } from '@/lib/auth/platform'

export default async function GkitJurMovimentacoesRoute({
  searchParams,
}: {
  searchParams?: Promise<ModuleSearchParams>
}) {
  const params = await searchParams
  const filters = buildGkitJurMovimentacaoFilters(params)
  const [context, data] = await Promise.all([
    requireGkitJurContext(moduleTarget('/modulos/gkit-jur/movimentacoes', params)),
    listGkitJurMovimentacoes(filters),
  ])

  return (
    <GkitJurShell
      active="movimentacoes"
      description="Histórico de movimentações processuais registradas."
      title="Movimentações"
      usuario={context.usuario}
    >
      <GkitJurMovimentacoesPage data={data} />
    </GkitJurShell>
  )
}
