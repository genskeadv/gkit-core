import { GkitJurAuditoriaPage, GkitJurShell } from '@/features/gkit-jur/components'
import { getGkitJurAuditoria, requireGkitJurContext } from '@/features/gkit-jur/queries'

export default async function GkitJurAuditoriaRoute() {
  const [context, data] = await Promise.all([
    requireGkitJurContext('/modulos/gkit-jur/auditoria'),
    getGkitJurAuditoria(),
  ])

  return (
    <GkitJurShell
      active="auditoria"
      description="Trilha de importações e futuras sincronizações do módulo jurídico."
      title="Auditoria"
      usuario={context.usuario}
    >
      <GkitJurAuditoriaPage data={data} />
    </GkitJurShell>
  )
}
