import { GkitAteFilterBar, GkitAteHealthNotice, GkitAteList, GkitAteSection, GkitAteShell } from '@/features/gkit-ate/components'
import { buildGkitAteAtendimentoFilters, filterGkitAteAtendimentos } from '@/features/gkit-ate/list-filters'
import { atendimentoRows, getGkitAteFormData, getGkitAteHealth, listGkitAteAtendimentos, requireGkitAteContext } from '@/features/gkit-ate/queries'
import { moduleTarget } from '@/lib/auth/platform'

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
      description="Base importada do ASTREA com status, cliente, responsavel e tarefas vinculadas."
      usuario={context.usuario}
    >
      <GkitAteHealthNotice health={health} />
      <GkitAteSection title="Lista de atendimentos" description="Consulte atendimentos por status, tipo, responsavel e texto livre.">
        <GkitAteFilterBar
          fields={[
            { label: 'Busca', name: 'q', placeholder: 'Codigo, cliente, titulo, objeto ou responsavel', value: filters.q },
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
              label: 'Responsavel',
              name: 'responsavel',
              options: responsavelOptions,
              placeholder: 'Todos',
              type: 'select',
              value: filters.responsavel,
            },
          ]}
          resetHref="/modulos/gkit-ate/atendimentos"
          resultCount={atendimentosFiltrados.length}
          sort={{
            dir: filters.dir,
            options: [
              { label: 'Data de criacao', value: 'data' },
              { label: 'Status', value: 'status' },
              { label: 'Cliente', value: 'cliente' },
              { label: 'Responsavel', value: 'responsavel' },
              { label: 'Tarefas pendentes', value: 'tarefas' },
            ],
            value: filters.sort,
          }}
          totalCount={atendimentos.length}
        />
        <GkitAteList empty="Nenhum atendimento encontrado com os filtros atuais." rows={atendimentoRows(atendimentosFiltrados)} />
      </GkitAteSection>
    </GkitAteShell>
  )
}
