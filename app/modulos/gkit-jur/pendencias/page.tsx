import { applyGkitJurSaneamentoSuggestionsAction } from '@/features/gkit-jur/actions'
import { GkitJurPendenciasPage, GkitJurShell } from '@/features/gkit-jur/components'
import { canWriteGkitJur, getGkitJurPendencias, requireGkitJurContext } from '@/features/gkit-jur/queries'

export default async function GkitJurPendenciasRoute() {
  const [context, data] = await Promise.all([
    requireGkitJurContext('/modulos/gkit-jur/pendencias'),
    getGkitJurPendencias(),
  ])

  return (
    <GkitJurShell
      active="pendencias"
      description="Fila de saneamento dos processos importados."
      title="Pendencias"
      usuario={context.usuario}
    >
      <GkitJurPendenciasPage
        action={applyGkitJurSaneamentoSuggestionsAction}
        canWrite={canWriteGkitJur(context.permissions)}
        data={data}
      />
    </GkitJurShell>
  )
}
