import Link from 'next/link'
import { FlexList, FlexSection, FlexShell } from '@/features/flex/components'
import {
  getFlexCompetenciaOperacional,
  listFlexCompetenciaOptions,
  listFlexDespesas,
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
  const [rows, competencias] = await Promise.all([
    listFlexDespesas(`${competencia}-01`, status),
    listFlexCompetenciaOptions(),
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
        <FlexSection eyebrow="Filtro" title="Despesas do mês" description="Filtre a competência e abra uma linha para classificar, ajustar ou vincular à previsão.">
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

        <FlexSection eyebrow="Realizado" title={`${rows.length} despesa(s) encontrada(s)`} description="Clique em uma linha para alterar classificação, dados do lançamento ou vínculo com a previsão mensal.">
          <FlexList bare rows={rows} empty="Nenhuma despesa encontrada para os filtros selecionados." />
        </FlexSection>
      </div>
    </FlexShell>
  )
}
