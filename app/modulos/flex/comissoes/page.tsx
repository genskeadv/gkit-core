import Link from 'next/link'
import { canAccess } from '@/lib/auth/permissions'
import { FlexComissoesOperacionaisList, FlexSection, FlexShell } from '@/features/flex/components'
import {
  approveFlexComissoesLoteAction,
  gerarFlexComissoesReceitasAction,
  previewFlexComissoesReceitasAction,
  updateFlexComissaoStatusAction,
} from '@/features/flex/actions'
import { FlexComissoesPreviewForm } from '@/features/flex/comissoes-preview-form'
import { listFlexComissoesOperacionais, listFlexCompetenciaOptions, requireFlexContext } from '@/features/flex/queries'

function competenciaAnterior() {
  const date = new Date()
  date.setMonth(date.getMonth() - 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function competenciaFilter(value?: string) {
  if (!value || value === 'todas') return undefined
  return /^\d{4}-\d{2}$/.test(value) ? `${value}-01` : undefined
}

function statusFilter(value?: string) {
  return ['calculada', 'em_conferencia', 'rejeitada', 'aprovada', 'paga', 'cancelada'].includes(value ?? '') ? value! : 'todos'
}

export default async function FlexComissoesPage({
  searchParams,
}: {
  searchParams?: Promise<{ competencia?: string; status?: string }>
}) {
  const params = await searchParams
  const context = await requireFlexContext()
  const competencia = params?.competencia && params.competencia !== 'todas' ? params.competencia : 'todas'
  const status = statusFilter(params?.status)
  const [rows, competencias] = await Promise.all([
    listFlexComissoesOperacionais(competenciaFilter(params?.competencia), status),
    listFlexCompetenciaOptions(),
  ])
  const canApprove = canAccess(context.permissions, 'flex.comissoes.approve')

  return (
    <FlexShell
      active="comissoes"
      title="Comissoes"
      description="Calculo, conferencia e historico de comissoes do Flex."
      usuario={context.usuario}
      actions={(
        <>
          <Link className="button secondary" href="/modulos/flex/tipos-comissao">Regras de comissao</Link>
          <Link className="button secondary" href="/modulos/flex/comissoes/mapeamentos">Mapeamento Omie</Link>
          <Link className="button" href="/modulos/flex/comissoes/nova">Nova comissao</Link>
        </>
      )}
    >
      <FlexSection eyebrow="Calculo" title="Gerar comissoes" description="Transforme receitas da competencia anterior em comissoes calculadas para conferencia.">
        <FlexComissoesPreviewForm
          confirmAction={gerarFlexComissoesReceitasAction}
          competencias={competencias}
          defaultCompetencia={competenciaAnterior()}
          previewAction={previewFlexComissoesReceitasAction}
        />
      </FlexSection>
      <FlexSection eyebrow="Historico" title="Comissoes registradas" description="Filtre, confira e aprove as comissoes geradas.">
        <FlexComissoesOperacionaisList
          approveAction={updateFlexComissaoStatusAction}
          bulkApproveAction={approveFlexComissoesLoteAction}
          canApprove={canApprove}
          competencia={competencia}
          competencias={competencias}
          rows={rows}
          status={status}
        />
      </FlexSection>
    </FlexShell>
  )
}
