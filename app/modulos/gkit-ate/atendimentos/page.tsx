import { GkitAteFilterBar, GkitAteGroupedList, GkitAteHealthNotice, GkitAteSection, GkitAteShell, GkitAteSummaryCards } from '@/features/gkit-ate/components'
import { buildGkitAteAtendimentoFilters, filterGkitAteAtendimentos } from '@/features/gkit-ate/list-filters'
import { atendimentoRows, getGkitAteFormData, getGkitAteHealth, listGkitAteAtendimentos, requireGkitAteContext } from '@/features/gkit-ate/queries'
import { moduleTarget } from '@/lib/auth/platform'

function atendimentoHrefForPage(filters: ReturnType<typeof buildGkitAteAtendimentoFilters>, page: number) {
  const params = new URLSearchParams()
  if (filters.q) params.set('q', filters.q)
  if (filters.status) params.set('status', filters.status)
  if (filters.tipo) params.set('tipo', filters.tipo)
  if (filters.responsavel) params.set('responsavel', filters.responsavel)
  if (filters.sort !== 'data') params.set('sort', filters.sort)
  if (filters.dir !== 'desc') params.set('dir', filters.dir)
  if (page > 1) params.set('pagina', String(page))
  const query = params.toString()
  return query ? `/modulos/gkit-ate/atendimentos?${query}` : '/modulos/gkit-ate/atendimentos'
}

export default async function GkitAteAtendimentosPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const context = await requireGkitAteContext(moduleTarget('/modulos/gkit-ate/atendimentos', params))
  const [health, formData, atendimentos] = await Promise.all([getGkitAteHealth(), getGkitAteFormData(), listGkitAteAtendimentos()])
  const filters = buildGkitAteAtendimentoFilters(params)
  const atendimentosFiltrados = filterGkitAteAtendimentos(atendimentos, filters)
  const responsavelOptions = Array.from(
    new Set(atendimentos.map((atendimento) => atendimento.responsavel).filter(Boolean) as string[]),
  )
    .sort((a, b) => a.localeCompare(b, 'pt-BR'))
    .map((value) => ({ label: value, value }))
  const atendimentoSummary = [
    { label: 'Total', value: atendimentosFiltrados.length },
    { label: 'Abertos', value: atendimentosFiltrados.filter((atendimento) => atendimento.status === 'aberto').length },
    { label: 'Encerrados', value: atendimentosFiltrados.filter((atendimento) => atendimento.status === 'encerrado').length },
    { label: 'Clientes', value: new Set(atendimentosFiltrados.map((atendimento) => atendimento.cliente_nome)).size },
    { label: 'Responsáveis', value: new Set(atendimentosFiltrados.map((atendimento) => atendimento.responsavel).filter(Boolean)).size },
    { label: 'Tipos', value: new Set(atendimentosFiltrados.map((atendimento) => atendimento.tipo).filter(Boolean)).size },
  ]
  const hasFilters = Boolean(
    filters.q ||
    filters.status ||
    filters.tipo ||
    filters.responsavel ||
    filters.sort !== 'data' ||
    filters.dir !== 'desc',
  )

  return (
    <GkitAteShell
      active="atendimentos"
      title="Atendimentos"
      description="Base importada do ASTREA com status, cliente, responsável e tarefas vinculadas."
      usuario={context.usuario}
    >
      <GkitAteHealthNotice health={health} />
      <GkitAteSection title="Atendimentos" description={`${atendimentosFiltrados.length} de ${atendimentos.length} atendimento(s)`}>
        <GkitAteSummaryCards items={atendimentoSummary} />
        <GkitAteFilterBar
          fields={[
            { label: 'Busca', name: 'q', placeholder: 'Código, cliente, título, objeto ou responsável', value: filters.q },
            {
              label: 'Status',
              name: 'status',
              options: [
                { label: 'Aberto', value: 'aberto' },
                { label: 'Encerrado', value: 'encerrado' },
              ],
              placeholder: 'Todos',
              type: 'select',
              value: filters.status,
            },
            {
              label: 'Tipo',
              name: 'tipo',
              options: formData.atendimentoTipos.map((tipo) => ({ label: tipo.label, value: tipo.id })),
              placeholder: 'Todos',
              type: 'select',
              value: filters.tipo,
            },
            {
              label: 'Responsável',
              name: 'responsavel',
              options: responsavelOptions,
              placeholder: 'Todos',
              type: 'select',
              value: filters.responsavel,
            },
          ]}
          hasFilters={hasFilters}
          resetHref="/modulos/gkit-ate/atendimentos"
          sort={{
            dir: filters.dir,
            options: [
              { label: 'Data de criação', value: 'data' },
              { label: 'Status', value: 'status' },
              { label: 'Cliente', value: 'cliente' },
              { label: 'Responsável', value: 'responsavel' },
              { label: 'Tarefas pendentes', value: 'tarefas' },
            ],
            value: filters.sort,
          }}
        />
        <GkitAteGroupedList
          empty="Nenhum atendimento encontrado com os filtros atuais."
          hrefForPage={(page) => atendimentoHrefForPage(filters, page)}
          itemLabel="atendimento(s)"
          page={filters.pagina}
          rows={atendimentoRows(atendimentosFiltrados)}
        />
      </GkitAteSection>
    </GkitAteShell>
  )
}
