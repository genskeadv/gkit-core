import { GkitJurPlaceholder, GkitJurShell } from '@/features/gkit-jur/components'
import { requireGkitJurContext } from '@/features/gkit-jur/queries'

export default async function GkitJurDocumentosRoute() {
  const context = await requireGkitJurContext('/modulos/gkit-jur/documentos')

  return (
    <GkitJurShell active="documentos" description="Controle de pecas, comprovantes e documentos do fluxo juridico." title="Documentos" usuario={context.usuario}>
      <GkitJurPlaceholder title="Documentos" description="Area reservada para biblioteca, modelos, anexos e pendencias documentais." />
    </GkitJurShell>
  )
}
