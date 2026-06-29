import { redirect } from 'next/navigation'
import { updateGkitJurProcessoAction } from '@/features/gkit-jur/actions'
import { GkitJurProcessDetailPage, GkitJurShell } from '@/features/gkit-jur/components'
import { canWriteGkitJur, getGkitJurProcessDetail, requireGkitJurContext } from '@/features/gkit-jur/queries'

export default async function GkitJurProcessoDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  if (!id) redirect('/modulos/gkit-jur/processos')

  const [context, data] = await Promise.all([
    requireGkitJurContext(`/modulos/gkit-jur/processos/${id}`),
    getGkitJurProcessDetail(id),
  ])

  return (
    <GkitJurShell
      active="processos"
      description="Resumo, vinculos operacionais e historico do processo."
      title={data.processo.numeroCnj}
      usuario={context.usuario}
    >
      <GkitJurProcessDetailPage
        action={updateGkitJurProcessoAction}
        canWrite={canWriteGkitJur(context.permissions)}
        data={data}
      />
    </GkitJurShell>
  )
}
