import Link from 'next/link'
import { gerarFlexPagamentosAgendaAction, gerarFlexPagamentosComissoesAction } from '@/features/flex/actions'
import { FlexCompetenciaForm, FlexList, FlexSection, FlexShell } from '@/features/flex/components'
import { listFlexCompetenciaOptions, listFlexPagamentos, requireFlexContext } from '@/features/flex/queries'

export default async function FlexPagamentosPage() {
  const context = await requireFlexContext()
  const [rows, competencias] = await Promise.all([listFlexPagamentos(), listFlexCompetenciaOptions()])

  return (
    <FlexShell
      active="pagamentos"
      title="Pagamentos"
      description="Pagamentos previstos, pagos e conciliados do Flex."
      usuario={context.usuario}
      actions={<Link className="button" href="/modulos/flex/pagamentos/novo">Novo pagamento</Link>}
    >
      <FlexSection eyebrow="Geração" title="Criar pagamentos da competência" description="Use agendas recorrentes e comissões aprovadas para montar a fila de pagamento.">
        <section className="flex-action-grid">
          <FlexCompetenciaForm
            action={gerarFlexPagamentosAgendaAction}
            button="Gerar agendas"
            competencias={competencias}
            description="Gera pagamentos previstos a partir das agendas recorrentes ativas."
            title="Gerar por agenda"
          />
          <FlexCompetenciaForm
            action={gerarFlexPagamentosComissoesAction}
            button="Gerar comissões"
            competencias={competencias}
            description="Gera pagamentos para comissões aprovadas sem pagamento vinculado."
            title="Gerar por comissão"
          />
        </section>
      </FlexSection>
      <FlexSection eyebrow="Fila" title="Pagamentos" description="Acompanhe pagamentos previstos, pagos e conciliados.">
        <FlexList rows={rows} empty="Nenhum pagamento registrado." />
      </FlexSection>
    </FlexShell>
  )
}
