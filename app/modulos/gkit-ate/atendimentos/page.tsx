import { GkitAteFilterBar, GkitAteGroupedList, GkitAteHealthNotice, GkitAteSection, GkitAteShell } from '@/features/gkit-ate/components'
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

  return (
    <GkitAteShell
      active="atendimentos"
      title="Atendimentos"
      description="Base importada do ASTREA com status, cliente, responsável e tarefas vinculadas."
      usuario={context.usuario}
    >
      <GkitAteHealthNotice health={health} />
      <GkitAteSection title="Atendimentos" description={`${atendimentosFiltrados.length} de ${atendimentos.length} atendimento(s)`}>
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
          resetHref="/modulos/gkit-ate/atendimentos"
          sort={{
            dir: filters.dir,
            options: [
              { label: 'Data de criacao', value: 'data' },
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
