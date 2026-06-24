import { GkitNewHealthNotice, GkitNewKpiCards, GkitNewList, GkitNewSection, GkitNewShell } from '@/features/gkit-new/components'
import { getGkitNewGestaoData, requireGkitNewContext } from '@/features/gkit-new/queries'

export default async function GkitNewGestaoPage() {
  const context = await requireGkitNewContext()
  const data = await getGkitNewGestaoData()

  return (
    <GkitNewShell
      active="gestao"
      title="Dashboard"
      description="Visao gerencial do pipeline, produtividade, indicadores e auditoria comercial."
      usuario={context.usuario}
    >
      <GkitNewHealthNotice health={data.health} />
      <GkitNewSection title="Indicadores gerenciais" description="Resumo compacto da carteira e das oportunidades em andamento.">
        <GkitNewKpiCards cards={data.cards} />
      </GkitNewSection>

      <GkitNewSection title="Oportunidades por status" description="Distribuição do pipeline pelo estágio atual.">
        <GkitNewList empty="Nenhuma oportunidade cadastrada." rows={data.oportunidadesPorStatus} />
      </GkitNewSection>

      <GkitNewSection title="Produtividade por responsável" description="Carteira acompanhada e valor aprovado por operador.">
        <GkitNewList empty="Nenhuma produtividade calculada ainda." rows={data.produtividade} />
      </GkitNewSection>

      <GkitNewSection title="Eventos recentes" description="Auditoria das principais ações executadas no módulo.">
        <GkitNewList empty="Nenhum evento registrado ainda." rows={data.eventos} />
      </GkitNewSection>
    </GkitNewShell>
  )
}
