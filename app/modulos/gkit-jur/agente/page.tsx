import {
  createGkitJurAgenteFonteAction,
  createGkitJurAgenteReceitaAction,
  runGkitJurAgenteReceitaAction,
  validateGkitJurAgenteExecucaoAction,
} from '@/features/gkit-jur/actions'
import { GkitJurAgentePage, GkitJurShell } from '@/features/gkit-jur/components'
import { canWriteGkitJur, getGkitJurAgenteData, requireGkitJurContext } from '@/features/gkit-jur/queries'

export default async function GkitJurAgenteRoute() {
  const [context, data] = await Promise.all([
    requireGkitJurContext('/modulos/gkit-jur/agente'),
    getGkitJurAgenteData(),
  ])

  return (
    <GkitJurShell
      active="agente"
      description="Fontes, receitas, execucoes e validacoes do agente de auxilio juridico."
      title="Agente juridico"
      usuario={context.usuario}
    >
      <GkitJurAgentePage
        canWrite={canWriteGkitJur(context.permissions)}
        createFonteAction={createGkitJurAgenteFonteAction}
        createReceitaAction={createGkitJurAgenteReceitaAction}
        data={data}
        runReceitaAction={runGkitJurAgenteReceitaAction}
        validateExecucaoAction={validateGkitJurAgenteExecucaoAction}
      />
    </GkitJurShell>
  )
}
