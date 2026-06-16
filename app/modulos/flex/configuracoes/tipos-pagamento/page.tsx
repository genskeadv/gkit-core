import { canAccess } from '@/lib/auth/permissions'
import { FlexList, FlexSection, FlexShell } from '@/features/flex/components'
import { listFlexTiposPagamento, requireFlexContext } from '@/features/flex/queries'

export default async function FlexTiposPagamentoPage() {
  const context = await requireFlexContext()
  const rows = await listFlexTiposPagamento()
  const canWrite = canAccess(context.permissions, 'flex.configuracoes.write')

  return (
    <FlexShell active="tiposPagamento" title="Tipos de pagamento" description="Tipos usados por pagamentos e agendas futuras." usuario={context.usuario}>
      <FlexSection eyebrow="Configuração" title="Tipos de pagamento" description="Classifique pagamentos manuais e recorrentes.">
        <FlexList canWrite={canWrite} createHref="/modulos/flex/configuracoes/tipos-pagamento/novo" empty="Nenhum tipo de pagamento cadastrado." rows={rows} />
      </FlexSection>
    </FlexShell>
  )
}
