import { updateGkitJurPublicacaoTratamentoAction } from '@/features/gkit-jur/actions'
import { GkitJurPublicacoesPage, GkitJurShell } from '@/features/gkit-jur/components'
import { buildGkitJurPublicacaoFilters, canWriteGkitJur, listGkitJurPublicacoes, requireGkitJurContext } from '@/features/gkit-jur/queries'
import { moduleTarget, type ModuleSearchParams } from '@/lib/auth/platform'

export default async function GkitJurPublicacoesRoute({
  searchParams,
}: {
  searchParams?: Promise<ModuleSearchParams>
}) {
  const params = await searchParams
  const filters = buildGkitJurPublicacaoFilters(params)
  const [context, data] = await Promise.all([
    requireGkitJurContext(moduleTarget('/modulos/gkit-jur/publicacoes', params)),
    listGkitJurPublicacoes(filters),
  ])

  return (
    <GkitJurShell
      active="publicacoes"
      description="Caixa de entrada para garantir que publicacoes e intimacoes recebam tratamento humano."
      title="Publicacoes"
      usuario={context.usuario}
    >
      <GkitJurPublicacoesPage
        canWrite={canWriteGkitJur(context.permissions)}
        data={data}
        returnTo={moduleTarget('/modulos/gkit-jur/publicacoes', params)}
        tratamentoAction={updateGkitJurPublicacaoTratamentoAction}
      />
    </GkitJurShell>
  )
}
