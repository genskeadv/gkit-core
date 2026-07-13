import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { saveGkitFatEmpresaEmissoraAction } from '@/features/gkit-fat/actions'
import { GkitFatEmpresaEmissoraForm, GkitFatHealthNotice, GkitFatSection, GkitFatShell } from '@/features/gkit-fat/components'
import { getGkitFatHealth, listGkitFatEmpresasEmissoras, requireGkitFatContext } from '@/features/gkit-fat/queries'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function GkitFatConfiguracoesPage() {
  const context = await requireGkitFatContext('/modulos/gkit-fat/configuracoes')
  if (!canAccess(context.permissions, 'gkit_fat.configuracoes.read')) redirect('/modulos/gkit-fat')
  const [health, empresas] = await Promise.all([
    getGkitFatHealth(),
    listGkitFatEmpresasEmissoras(),
  ])
  const canWrite = canAccess(context.permissions, 'gkit_fat.configuracoes.write')
  const empresa = empresas[0] ?? null

  return (
    <GkitFatShell
      active="configuracoes"
      description="Parametros fiscais usados na conferencia e preparo da NFS-e."
      title="Configuracoes fiscais"
      usuario={context.usuario}
    >
      <GkitFatHealthNotice health={health} />
      <GkitFatSection title="Empresa emissora" description="Complete os dados antes de operar em producao.">
        {canWrite ? (
          <GkitFatEmpresaEmissoraForm action={saveGkitFatEmpresaEmissoraAction} empresa={empresa} />
        ) : (
          <div className="suite-empty-block">Voce nao tem permissao para alterar configuracoes fiscais.</div>
        )}
      </GkitFatSection>
    </GkitFatShell>
  )
}
