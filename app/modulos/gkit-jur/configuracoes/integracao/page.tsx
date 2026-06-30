import { GkitJurIntegracaoPage, GkitJurShell } from '@/features/gkit-jur/components'
import { getGkitJurIntegracaoData, requireGkitJurContext } from '@/features/gkit-jur/queries'

export default async function GkitJurIntegracaoRoute() {
  const [context, data] = await Promise.all([
    requireGkitJurContext('/modulos/gkit-jur/configuracoes/integracao'),
    getGkitJurIntegracaoData(),
  ])

  return (
    <GkitJurShell
      active="configuracoes"
      description="Conexao, tribunais, fila e execucoes da integracao DataJud."
      title="Integracao DataJud"
      usuario={context.usuario}
    >
      <GkitJurIntegracaoPage data={data} />
    </GkitJurShell>
  )
}
