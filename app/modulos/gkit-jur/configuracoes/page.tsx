import { GkitJurConfiguracoesPage, GkitJurShell } from '@/features/gkit-jur/components'
import { requireGkitJurContext } from '@/features/gkit-jur/queries'

export default async function GkitJurConfiguracoesRoute() {
  const context = await requireGkitJurContext('/modulos/gkit-jur/configuracoes')

  return (
    <GkitJurShell
      active="configuracoes"
      description="Parametros, saneamento e integracoes do modulo juridico."
      title="Configuracoes"
      usuario={context.usuario}
    >
      <GkitJurConfiguracoesPage />
    </GkitJurShell>
  )
}
