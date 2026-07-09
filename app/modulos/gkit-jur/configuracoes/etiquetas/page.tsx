import { saveGkitJurEtiquetaAction } from '@/features/gkit-jur/actions'
import { GkitJurEtiquetasPage, GkitJurShell } from '@/features/gkit-jur/components'
import { canConfigureGkitJur, getGkitJurEtiquetasData, requireGkitJurContext } from '@/features/gkit-jur/queries'

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? ''
}

export default async function GkitJurEtiquetasRoute({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const [context, data] = await Promise.all([
    requireGkitJurContext('/modulos/gkit-jur/configuracoes/etiquetas'),
    getGkitJurEtiquetasData(),
  ])

  return (
    <GkitJurShell
      active="configuracoes"
      description="Cadastro de etiquetas para classificar e filtrar processos."
      title="Etiquetas"
      usuario={context.usuario}
    >
      <GkitJurEtiquetasPage
        canWrite={canConfigureGkitJur(context.permissions)}
        data={data}
        saved={one(params?.saved) === 'ok'}
        saveAction={saveGkitJurEtiquetaAction}
      />
    </GkitJurShell>
  )
}
