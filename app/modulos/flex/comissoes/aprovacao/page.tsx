import { updateFlexComissaoStatusAction } from '@/features/flex/actions'
import { FlexSection, FlexShell, FlexStatusActionList } from '@/features/flex/components'
import { listFlexComissoes, requireFlexContext } from '@/features/flex/queries'

export default async function FlexComissoesAprovacaoPage() {
  const context = await requireFlexContext()
  const rows = (await listFlexComissoes()).filter((row) => ['calculada', 'em_conferencia', 'rejeitada'].includes(row.status))

  return (
    <FlexShell
      active="comissoesAprovacao"
      title="Aprovação de comissões"
      description="Fila de conferencia antes da geracao de pagamentos."
      usuario={context.usuario}
    >
      <FlexSection eyebrow="Fila" title="Comissões para decisão" description="Aprove apenas comissões conferidas; rejeições retornam para tratamento.">
        <FlexStatusActionList action={updateFlexComissaoStatusAction} rows={rows} />
      </FlexSection>
    </FlexShell>
  )
}
