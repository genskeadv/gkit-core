import { GkitJurGlobalSearchPage, GkitJurShell } from '@/features/gkit-jur/components'
import { requireGkitJurContext, searchGkitJurGlobal } from '@/features/gkit-jur/queries'
import type { ModuleSearchParams } from '@/lib/auth/platform'

export default async function GkitJurBuscaRoute({ searchParams }: { searchParams?: Promise<ModuleSearchParams> }) {
  const params = await searchParams
  const query = Array.isArray(params?.q) ? params?.q[0] ?? '' : params?.q ?? ''
  const [context, data] = await Promise.all([
    requireGkitJurContext('/modulos/gkit-jur/busca'),
    searchGkitJurGlobal(query),
  ])

  return (
    <GkitJurShell
      active="processos"
      description="Busca transversal em processos ativos, tarefas abertas e movimentações."
      title="Busca global"
      usuario={context.usuario}
    >
      <GkitJurGlobalSearchPage data={data} />
    </GkitJurShell>
  )
}
