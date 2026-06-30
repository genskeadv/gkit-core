import { GkitJurPlaceholder, GkitJurShell } from '@/features/gkit-jur/components'
import { requireGkitJurContext } from '@/features/gkit-jur/queries'

export default async function GkitJurCadastrosRoute() {
  const context = await requireGkitJurContext('/modulos/gkit-jur/cadastros')

  return (
    <GkitJurShell active="cadastros" description="Cadastros de apoio do fluxo jurídico." title="Cadastros" usuario={context.usuario}>
      <GkitJurPlaceholder title="Cadastros" description="Área reservada para tipos, fases, etiquetas, origens e demais bases de apoio." />
    </GkitJurShell>
  )
}
