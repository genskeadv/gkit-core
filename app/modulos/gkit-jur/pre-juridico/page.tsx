import { createGkitJurPreJuridicoAction, updateGkitJurPreJuridicoAction } from '@/features/gkit-jur/actions'
import { GkitJurPreJuridicoPage, GkitJurShell } from '@/features/gkit-jur/components'
import { buildGkitJurPreJuridicoFilters, canWriteGkitJur, listGkitJurPreJuridicos, requireGkitJurContext } from '@/features/gkit-jur/queries'
import { moduleTarget, type ModuleSearchParams } from '@/lib/auth/platform'

export default async function GkitJurPreJuridicoRoute({
  searchParams,
}: {
  searchParams?: Promise<ModuleSearchParams>
}) {
  const params = await searchParams
  const target = moduleTarget('/modulos/gkit-jur/pre-juridico', params)
  const filters = buildGkitJurPreJuridicoFilters(params)
  const [context, data] = await Promise.all([
    requireGkitJurContext(target),
    listGkitJurPreJuridicos(filters),
  ])

  return (
    <GkitJurShell
      active="pre_juridico"
      description="Triagem de casos em análise antes de virarem processos judiciais."
      title="Pré-jurídico"
      usuario={context.usuario}
    >
      <GkitJurPreJuridicoPage
        canWrite={canWriteGkitJur(context.permissions)}
        createAction={createGkitJurPreJuridicoAction}
        data={data}
        updateAction={updateGkitJurPreJuridicoAction}
      />
    </GkitJurShell>
  )
}
