import { GkitJurConfiguracoesPage, GkitJurShell } from '@/features/gkit-jur/components'
import { requireGkitJurContext } from '@/features/gkit-jur/queries'

export default async function GkitJurConfiguracoesRoute() {
  const context = await requireGkitJurContext('/modulos/gkit-jur/configuracoes')

  return (
    <GkitJurShell
      active="configuracoes"
      description="Parâmetros, saneamento e integrações do módulo jurídico."
      title="Configurações"
      usuario={context.usuario}
    >
      <GkitJurConfiguracoesPage />
    </GkitJurShell>
  )
}
