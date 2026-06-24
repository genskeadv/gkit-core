import Link from 'next/link'
import { FlexSection, FlexShell } from '@/features/flex/components'
import {
  gerarFlexComissoesReceitasAction,
  previewFlexComissoesReceitasAction,
} from '@/features/flex/actions'
import { FlexComissoesPreviewForm } from '@/features/flex/comissoes-preview-form'
import { listFlexCompetenciaOptions, requireFlexContext } from '@/features/flex/queries'

function competenciaAnterior() {
  const date = new Date()
  date.setMonth(date.getMonth() - 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export default async function FlexComissoesPage() {
  const context = await requireFlexContext()
  const competencias = await listFlexCompetenciaOptions()

  return (
    <FlexShell
      active="comissoes"
      title="Comissões"
      description="Cálculo e conferência inicial das comissões do Flex."
      usuario={context.usuario}
      actions={(
        <>
          <Link className="button secondary" href="/modulos/flex/tipos-comissao">Regras de comissão</Link>
          <Link className="button secondary" href="/modulos/flex/comissoes/mapeamentos">Mapeamento Omie</Link>
          <Link className="button secondary" href="/modulos/flex/financeiro">Histórico em Gestão</Link>
          <Link className="button" href="/modulos/flex/comissoes/nova">Nova comissão</Link>
        </>
      )}
    >
      <FlexSection eyebrow="Cálculo" title="Gerar comissões" description="Transforme receitas da competência anterior em comissões calculadas para conferência.">
        <FlexComissoesPreviewForm
          confirmAction={gerarFlexComissoesReceitasAction}
          competencias={competencias}
          defaultCompetencia={competenciaAnterior()}
          previewAction={previewFlexComissoesReceitasAction}
        />
      </FlexSection>
    </FlexShell>
  )
}
