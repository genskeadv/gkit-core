import Link from 'next/link'
import { GkitNewFilterBar, GkitNewHealthNotice, GkitNewList, GkitNewSection, GkitNewShell } from '@/features/gkit-new/components'
import { buildGkitNewOportunidadeFilters, filterGkitNewOportunidades } from '@/features/gkit-new/list-filters'
import { canWriteGkitNew, getGkitNewHealth, listGkitNewOportunidades, oportunidadeRows, requireGkitNewContext } from '@/features/gkit-new/queries'
import { moduleTarget } from '@/lib/auth/platform'

export default async function GkitNewOportunidadesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const context = await requireGkitNewContext(moduleTarget('/modulos/gkit-new/oportunidades', params))
  const [health, oportunidades] = await Promise.all([getGkitNewHealth(), listGkitNewOportunidades()])
  const canWrite = canWriteGkitNew(context.permissions, 'gkit_new.oportunidades.write')
  const filters = buildGkitNewOportunidadeFilters(params)
  const oportunidadesFiltradas = filterGkitNewOportunidades(oportunidades, filters)
  const responsavelOptions = Array.from(
    new Map(
      oportunidades
        .filter((oportunidade) => oportunidade.responsavel_id)
        .map((oportunidade) => [oportunidade.responsavel_id ?? '', oportunidade.responsavel_nome])
    )
  )
    .sort(([, a], [, b]) => a.localeCompare(b, 'pt-BR'))
    .map(([value, label]) => ({ label, value }))

  return (
    <GkitNewShell
      active="oportunidades"
      title="Oportunidades"
      description="Negociacoes comerciais com workflow automatico de tarefas."
      usuario={context.usuario}
      actions={canWrite ? <Link className="button" href="/modulos/gkit-new/oportunidades/novo">Nova oportunidade</Link> : null}
    >
      <GkitNewHealthNotice health={health} />
      <GkitNewSection title="Pipeline operacional" description="Aprovada ativa o cliente; encerrada finaliza a negociacao.">
        <GkitNewFilterBar
          fields={[
            { label: 'Busca', name: 'q', placeholder: 'Descricao, cliente, contato ou escopo', value: filters.q },
            {
              label: 'Status',
              name: 'status',
              options: [
                { label: 'Nova', value: 'nova' },
                { label: 'Proposta enviada', value: 'proposta_enviada' },
                { label: 'Em negociacao', value: 'em_negociacao' },
                { label: 'Aprovada', value: 'aprovada' },
                { label: 'Rejeitada', value: 'rejeitada' },
                { label: 'Cancelada', value: 'cancelada' },
                { label: 'Encerrada', value: 'encerrada' },
              ],
              placeholder: 'Todos',
              type: 'select',
              value: filters.status,
            },
            {
              label: 'Tipo',
              name: 'tipo',
              options: [
                { label: 'Mensal', value: 'mensal' },
                { label: 'Pontual', value: 'pontual' },
              ],
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
          resetHref="/modulos/gkit-new/oportunidades"
          resultCount={oportunidadesFiltradas.length}
          sort={{
            dir: filters.dir,
            options: [
              { label: 'Data', value: 'data' },
              { label: 'Valor', value: 'valor' },
              { label: 'Status', value: 'status' },
              { label: 'Cliente', value: 'cliente' },
              { label: 'Tarefas pendentes', value: 'tarefas' },
            ],
            value: filters.sort,
          }}
          totalCount={oportunidades.length}
        />
        <GkitNewList
          empty="Nenhuma oportunidade encontrada com os filtros atuais."
          rows={oportunidadeRows(oportunidadesFiltradas)}
        />
      </GkitNewSection>
    </GkitNewShell>
  )
}
