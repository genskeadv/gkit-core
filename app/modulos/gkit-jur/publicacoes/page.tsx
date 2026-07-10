import { GkitJurPublicacoesCockpitPage, GkitJurShell } from '@/features/gkit-jur/components'
import { buildGkitJurPublicacaoFilters, listGkitJurPublicacoes, requireGkitJurContext } from '@/features/gkit-jur/queries'

export default async function GkitJurPublicacoesRoute() {
  const [context, data] = await Promise.all([
    requireGkitJurContext('/modulos/gkit-jur/publicacoes'),
    listGkitJurPublicacoes(buildGkitJurPublicacaoFilters()),
  ])

  return (
    <GkitJurShell
      active="publicacoes"
      description="Cockpit de monitoramento e triagem das publicacoes capturadas."
      title="Publicacoes"
      usuario={context.usuario}
    >
      <GkitJurPublicacoesCockpitPage data={data} />
    </GkitJurShell>
  )
}
