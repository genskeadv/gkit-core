import Link from 'next/link'
import { canAccess } from '@/lib/auth/permissions'
import {
  approveFlexComissoesLoteAction,
  gerarFlexValidacaoItensAction,
  updateFlexComissaoStatusAction,
  upsertFlexDespesaCategoriaMapeamentoAction,
  upsertFlexReceitaCategoriaMapeamentoAction,
} from '@/features/flex/actions'
import { FlexCompetenciaForm, FlexComissoesOperacionaisList, FlexDespesaCategoriaMapeamentosPanel, FlexKpis, FlexList, FlexQuickLinks, FlexReceitaCategoriaMapeamentosPanel, FlexSection, FlexShell } from '@/features/flex/components'
import {
  getFlexCompetenciaOperacional,
  getFlexFinanceiroResumo,
  getFlexFormData,
  listFlexComissoesOperacionais,
  listFlexCompetenciaOptions,
  listFlexDespesaCategoriaMapeamentos,
  listFlexDespesaCategoriaPendencias,
  listFlexReceitaCategoriaMapeamentos,
  listFlexReceitaCategoriaPendencias,
  requireFlexContext,
} from '@/features/flex/queries'

const atalhos = [
  { href: '/modulos/flex/financeiro/receitas', title: 'Receitas', description: 'Receitas realizadas e base futura das comissões.', label: 'Entrada', meta: 'Recebido' },
  { href: '/modulos/flex/financeiro/previsao', title: 'Previsão', description: 'Planejamento, calendário e pagamentos previstos por competência.', label: 'Plano', meta: 'Calendário' },
  { href: '/modulos/flex/financeiro/despesas', title: 'Despesas', description: 'Realizado do mês, classificação e validação de extrato.', label: 'Saída', meta: 'Validação' },
  { href: '/modulos/flex/financeiro/extratos', title: 'Extratos', description: 'Arquivos e lançamentos normalizados.', label: 'Banco', meta: 'Conciliação' },
  { href: '/modulos/flex/financeiro/sugestoes', title: 'Sugestões', description: 'Pendências operacionais geradas pelo Flex.', label: 'Fila', meta: 'Tratamento' },
]

function competenciaFilter(value?: string) {
  if (!value || value === 'todas') return undefined
  return /^\d{4}-\d{2}$/.test(value) ? `${value}-01` : undefined
}

function statusFilter(value?: string) {
  return ['calculada', 'em_conferencia', 'rejeitada', 'aprovada', 'paga', 'cancelada'].includes(value ?? '') ? value! : 'todos'
}

export default async function FlexFinanceiroPage({
  searchParams,
}: {
  searchParams?: Promise<{ competencia?: string; pendencias?: string; status?: string }>
}) {
  const params = await searchParams
  const context = await requireFlexContext()
  const comissoesCompetencia = params?.competencia && params.competencia !== 'todas' ? params.competencia : 'todas'
  const comissoesStatus = statusFilter(params?.status)
  const [data, competenciaAtual, competencias, formData, rotasReceitas, categoriasPendentes, rotasDespesas, termosDespesasPendentes, comissoesRows] = await Promise.all([
    getFlexFinanceiroResumo(),
    getFlexCompetenciaOperacional(),
    listFlexCompetenciaOptions(),
    getFlexFormData(),
    listFlexReceitaCategoriaMapeamentos(),
    listFlexReceitaCategoriaPendencias(),
    listFlexDespesaCategoriaMapeamentos(),
    listFlexDespesaCategoriaPendencias(),
    listFlexComissoesOperacionais(competenciaFilter(params?.competencia), comissoesStatus),
  ])
  const canApproveComissoes = canAccess(context.permissions, 'flex.comissoes.approve')
  const competencia = competenciaAtual.competenciaMes
  const activePendencias = params?.pendencias === 'receitas' ? 'receitas' : 'despesas'
  const pendenciasRows = activePendencias === 'receitas' ? data.pendenciasReceitas : data.pendenciasDespesas
  const pendenciasEmpty = activePendencias === 'receitas' ? 'Nenhuma pendência de receita.' : 'Nenhuma pendência de despesa.'
  const fechamentoLinks = [
    {
      href: `/modulos/flex/financeiro/despesas?competencia=${competencia}`,
      title: 'Acompanhar despesas',
      description: `Pendências e realizado de ${competencia}.`,
      label: 'Despesas',
      meta: 'Dia a dia',
    },
    {
      href: competenciaAtual.detailHref,
      title: 'Checklist mensal',
      description: `Status ${competenciaAtual.status} com ${competenciaAtual.pendenciasTotal} pendência(s).`,
      label: 'Gestão',
      meta: competenciaAtual.label,
    },
  ]

  return (
    <FlexShell
      active="financeiro"
      title="Gestão"
      description="Resumo da operação financeira e fechamento mensal do Flex."
      usuario={context.usuario}
      actions={<Link className="button" href={`/modulos/flex/financeiro/despesas?competencia=${competencia}`}>Abrir despesas</Link>}
    >
      <div className="flex-financeiro-page">
        <div className="flex-financeiro-top">
          <FlexSection eyebrow="Resumo" title="Indicadores financeiros" description="Sinais principais da competência.">
            <FlexKpis data={data} />
          </FlexSection>
          <FlexSection eyebrow="Fechamento" title={`Competência ${competenciaAtual.label}`} description={`Status atual: ${competenciaAtual.status}.`}>
            <FlexQuickLinks items={fechamentoLinks} />
          </FlexSection>
        </div>
        <FlexSection eyebrow="Rotina" title="Centros de trabalho" description="Acesso direto aos pontos da operação.">
          <FlexQuickLinks items={atalhos} />
        </FlexSection>
        <FlexSection eyebrow="Comissões" title="Histórico de comissões" description="Filtre, confira e aprove as comissões geradas.">
          <FlexComissoesOperacionaisList
            approveAction={updateFlexComissaoStatusAction}
            bulkApproveAction={approveFlexComissoesLoteAction}
            canApprove={canApproveComissoes}
            competencia={comissoesCompetencia}
            competencias={competencias}
            returnBaseHref="/modulos/flex/financeiro"
            rows={comissoesRows}
            status={comissoesStatus}
          />
        </FlexSection>
        <div id="rotas-receitas">
          <FlexSection eyebrow="Receitas" title="Rotas automáticas de categoria" description="Cadastre como categorias do Omie devem entrar no Flex nas próximas importações.">
            <FlexReceitaCategoriaMapeamentosPanel
              action={upsertFlexReceitaCategoriaMapeamentoAction}
              categorias={formData.categoriasReceita}
              mapeamentos={rotasReceitas}
              pendencias={categoriasPendentes}
            />
          </FlexSection>
        </div>
        <div id="rotas-despesas">
          <FlexSection eyebrow="Despesas" title="Rotas automáticas de despesas" description="Cadastre termos do extrato para classificar saídas automaticamente nas próximas importações OFX.">
            <FlexDespesaCategoriaMapeamentosPanel
              action={upsertFlexDespesaCategoriaMapeamentoAction}
              categorias={formData.categoriasDespesa}
              mapeamentos={rotasDespesas}
              pendencias={termosDespesasPendentes}
            />
          </FlexSection>
        </div>
        <FlexSection eyebrow="Suporte" title="Reprocessar validação de despesas" description="Use quando a previsão mensal for alterada depois da importação do extrato.">
          <FlexCompetenciaForm
            action={gerarFlexValidacaoItensAction}
            button="Reprocessar despesas"
            competencias={competencias}
            defaultCompetencia={competencia}
            description="Recria pendências abertas da competência e preserva decisões já tratadas."
            title="Validação manual"
          />
        </FlexSection>
        <section className="card suite-panel flex-pendencias-panel">
          <div className="suite-panel-heading">
            <div>
              <h2>Pendências financeiras</h2>
              <p>{pendenciasRows.length} registro(s) para tratamento</p>
            </div>
            <nav className="suite-tabs flex-finance-tabs" aria-label="Pendências financeiras">
              <Link className={activePendencias === 'receitas' ? 'active' : ''} href="/modulos/flex/financeiro?pendencias=receitas">
                Receitas <span>{data.pendenciasReceitas.length}</span>
              </Link>
              <Link className={activePendencias === 'despesas' ? 'active' : ''} href="/modulos/flex/financeiro?pendencias=despesas">
                Despesas <span>{data.pendenciasDespesas.length}</span>
              </Link>
            </nav>
          </div>
          <FlexList bare rows={pendenciasRows} empty={pendenciasEmpty} />
        </section>
      </div>
    </FlexShell>
  )
}
