import { GkitJurMovimentacoesPage, GkitJurShell } from '@/features/gkit-jur/components'
import { listGkitJurMovimentacoes, requireGkitJurContext } from '@/features/gkit-jur/queries'

export default async function GkitJurMovimentacoesRoute() {
  const [context, data] = await Promise.all([
    requireGkitJurContext('/modulos/gkit-jur/movimentacoes'),
    listGkitJurMovimentacoes(),
  ])

  return (
    <GkitJurShell
      active="movimentacoes"
      description="Historico de movimentacoes processuais registradas."
      title="Movimentacoes"
      usuario={context.usuario}
    >
      <GkitJurMovimentacoesPage data={data} />
    </GkitJurShell>
  )
}
