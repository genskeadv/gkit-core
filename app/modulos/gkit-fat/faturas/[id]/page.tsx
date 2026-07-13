import { notFound, redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { prepareGkitFatNfseAction, registerGkitFatNfseManualAction } from '@/features/gkit-fat/actions'
import { GkitFatHealthNotice, GkitFatNfseWorkbench, GkitFatShell } from '@/features/gkit-fat/components'
import { getGkitFatHealth, getGkitFatOrdem, listGkitFatEmpresasEmissoras, requireGkitFatContext } from '@/features/gkit-fat/queries'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function GkitFatFaturaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const context = await requireGkitFatContext(`/modulos/gkit-fat/faturas/${id}`)
  if (!canAccess(context.permissions, 'gkit_fat.faturas.read')) redirect('/modulos/gkit-fat')
  const [health, ordem, empresas] = await Promise.all([
    getGkitFatHealth(),
    getGkitFatOrdem(context.usuario, id),
    listGkitFatEmpresasEmissoras(),
  ])

  if (!ordem) notFound()
  const canWrite = canAccess(context.permissions, 'gkit_fat.nfse.write')

  return (
    <GkitFatShell
      active="faturas"
      description="Conferencia fiscal, pre-nota e retorno manual da NFS-e."
      title={`NFS-e ${ordem.numero}`}
      usuario={context.usuario}
    >
      <GkitFatHealthNotice health={health} />
      <GkitFatNfseWorkbench
        canWrite={canWrite}
        empresas={empresas}
        ordem={ordem}
        prepareAction={prepareGkitFatNfseAction}
        registerAction={registerGkitFatNfseManualAction}
      />
    </GkitFatShell>
  )
}
