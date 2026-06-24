import Link from 'next/link'
import { updateFlexExtratoLancamentoAction } from '@/features/flex/actions'
import { FlexDespesasInlineList, FlexSection, FlexShell } from '@/features/flex/components'
import {
  getFlexCompetenciaOperacional,
  getFlexFormData,
  listFlexCompetenciaOptions,
  listFlexDespesasInline,
  requireFlexContext,
} from '@/features/flex/queries'

const statusOptions = [
  { id: 'todos', label: 'Todos' },
  { id: 'pendente', label: 'Pendentes' },
  { id: 'classificado', label: 'Classificados' },
]

function competenciaDate(value: string) {
  return /^\d{4}-\d{2}$/.test(value) ? `${value}-01` : undefined
}

function statusFilter(value?: string) {
  return value === 'pendente' || value === 'classificado' ? value : 'todos'
}

export default async function FlexDespesasPage({
  searchParams,
}: {
  searchParams?: Promise<{ competencia?: string; status?: string }>
}) {
  const params = await searchParams
  const context = await requireFlexContext()
  const competenciaAtual = await getFlexCompetenciaOperacional()
  const competencia = params?.competencia && competenciaDate(params.competencia) ? params.competencia : competenciaAtual.competenciaMes
  const status = statusFilter(params?.status)
  const returnTo = `/modulos/flex/financeiro/despesas?competencia=${competencia}&status=${status}`
  const [rows, competencias, formData] = await Promise.all([
    listFlexDespesasInline(`${competencia}-01`, status),
    listFlexCompetenciaOptions(),
    getFlexFormData(),
  ])

  return (
    <FlexShell
      active="despesas"
      title="Despesas"
      description={`Lançamentos de saída da competência ${competencia}.`}
      usuario={context.usuario}
      actions={(
        <>
          <Link className="button secondary" href="/modulos/flex/financeiro/previsao">Abrir previsão</Link>
          <Link className="button" href="/modulos/flex/importacoes">Registrar extrato</Link>
        </>
      )}
    >
      <div className="flex-despesas-page">
        <FlexSection eyebrow="Filtro" title="Despesas do mês" description="Filtre a competência e classifique os lançamentos direto na lista.">
          <form className="flex-filter-bar">
            <label>
              <span>Competência</span>
              <select name="competencia" defaultValue={competencia}>
                {competencias.map((item) => (
                  <option key={item.id} value={item.id}>{item.label}{item.meta ? ` - ${item.meta}` : ''}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Status</span>
              <select name="status" defaultValue={status}>
                {statusOptions.map((item) => (
                  <option key={item.id} value={item.id}>{item.label}</option>
                ))}
              </select>
            </label>
            <button className="button" type="submit">Aplicar filtros</button>
          </form>
        </FlexSection>

        <FlexSection eyebrow="Realizado" title={`${rows.length} despesa(s) encontrada(s)`} description="Classifique a categoria e marque se a despesa compõe a base recorrente direto na linha.">
          <FlexDespesasInlineList action={updateFlexExtratoLancamentoAction} formData={formData} returnTo={returnTo} rows={rows} />
        </FlexSection>
      </div>
    </FlexShell>
  )
}
