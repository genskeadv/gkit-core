import Link from 'next/link'
import { FixCockpit, FixCompetenciaAtualCard, FixShell } from '@/features/fix/components'
import { getFixCockpitResumo, getFixCompetenciaAtualGovernanca, requireIntrContext } from '@/features/fix/queries'

export default async function FixPage() {
  const context = await requireIntrContext()
  const [resumo, competenciaAtual] = await Promise.all([
    getFixCockpitResumo(),
    getFixCompetenciaAtualGovernanca(),
  ])

  return (
    <FixShell
      active="cockpit"
      title="Cockpit Operacional"
      description="Ponto diário de controle da competência aberta."
      usuario={context.usuario}
      actions={<Link className="button" href="/modulos/fix/importacoes">Importar dados</Link>}
    >
      <FixCompetenciaAtualCard fechamento={competenciaAtual} />
      <FixCockpit
        cards={resumo.cards}
        colaboradoresCards={resumo.colaboradores.cards}
        comissoes={resumo.colaboradores.comissoes}
        contasPagar={resumo.financeiro.contasPagar}
        extratos={resumo.financeiro.extratos}
        fechamentos={resumo.gestao.fechamentos}
        importacoes={resumo.gestao.importacoes}
        macrogrupos={resumo.financeiro.macrogrupos}
        pagamentos={resumo.colaboradores.pagamentos}
        previsao={resumo.financeiro.previsao}
        sugestoes={resumo.financeiro.sugestoes}
      />
    </FixShell>
  )
}
