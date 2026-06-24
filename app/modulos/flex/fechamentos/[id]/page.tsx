import { fecharFlexFechamentoAction, reabrirFlexFechamentoAction } from '@/features/flex/actions'
import { FlexFechamentoActions, FlexKpis, FlexList, FlexSection, FlexShell } from '@/features/flex/components'
import { getFlexFechamento, listFlexFechamentoChecklist, requireFlexContext } from '@/features/flex/queries'

export default async function FlexFechamentoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireFlexContext()
  const { id } = await params
  const [fechamento, checklist] = await Promise.all([getFlexFechamento(id), listFlexFechamentoChecklist(id)])

  return (
    <FlexShell
      active="fechamentos"
      title={`Fechamento ${fechamento.competencia}`}
      description="Resumo mensal, checklist e ações de fechamento."
      usuario={context.usuario}
    >
      <FlexSection eyebrow="Resumo" title="Indicadores da competência" description="Totais consolidados usados na decisão de fechamento.">
        <FlexKpis
          data={{
            cards: [
              { label: 'Receitas', value: Number(fechamento.receita_total).toLocaleString('pt-BR', { currency: 'BRL', style: 'currency' }), hint: 'realizadas' },
              { label: 'Despesas', value: Number(fechamento.despesa_total).toLocaleString('pt-BR', { currency: 'BRL', style: 'currency' }), hint: 'classificadas' },
              { label: 'Comissões', value: Number(fechamento.comissao_total).toLocaleString('pt-BR', { currency: 'BRL', style: 'currency' }), hint: 'calculadas' },
              { label: 'Pagos', value: Number(fechamento.pagamentos_pagos_total).toLocaleString('pt-BR', { currency: 'BRL', style: 'currency' }), hint: 'processados' },
              { label: 'Pendências', value: String(fechamento.pendencias_total), hint: fechamento.status },
            ],
            pendencias: [],
            pendenciasReceitas: [],
            pendenciasDespesas: [],
          }}
        />
      </FlexSection>
      <FlexSection eyebrow="Checklist" title="Pendências do fechamento" description="Itens que precisam estar ok antes de fechar a competência.">
        <FlexList rows={checklist} empty="Checklist ainda não gerado." />
      </FlexSection>
      <FlexSection eyebrow="Governança" title="Ações de fechamento" description="Feche competências sem pendências ou reabra informando motivo.">
        <FlexFechamentoActions fechamento={fechamento} fecharAction={fecharFlexFechamentoAction} reabrirAction={reabrirFlexFechamentoAction} />
      </FlexSection>
    </FlexShell>
  )
}
