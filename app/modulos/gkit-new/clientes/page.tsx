import Link from 'next/link'
import { GkitNewFilterBar, GkitNewHealthNotice, GkitNewList, GkitNewSection, GkitNewShell } from '@/features/gkit-new/components'
import { buildGkitNewClienteFilters, filterGkitNewClientes } from '@/features/gkit-new/list-filters'
import { canWriteGkitNew, clienteRows, getGkitNewHealth, listGkitNewClientes, requireGkitNewContext } from '@/features/gkit-new/queries'
import { moduleTarget } from '@/lib/auth/platform'

export default async function GkitNewClientesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const context = await requireGkitNewContext(moduleTarget('/modulos/gkit-new/clientes', params))
  const [health, clientes] = await Promise.all([getGkitNewHealth(), listGkitNewClientes()])
  const canWrite = canWriteGkitNew(context.permissions, 'gkit_new.clientes.write')
  const filters = buildGkitNewClienteFilters(params)
  const clientesFiltrados = filterGkitNewClientes(clientes, filters)

  return (
    <GkitNewShell
      active="clientes"
      title="Clientes"
      description="Base única de clientes e prospectos com CPF ou CNPJ obrigatório."
      usuario={context.usuario}
      actions={canWrite ? <Link className="button" href="/modulos/gkit-new/clientes/novo">Novo cliente</Link> : null}
    >
      <GkitNewHealthNotice health={health} />
      <GkitNewSection title="Base de clientes" description="Status derivado automaticamente por oportunidade aprovada.">
        <GkitNewFilterBar
          fields={[
            { label: 'Busca', name: 'q', placeholder: 'Nome, documento ou observacao', value: filters.q },
            {
              label: 'Status',
              name: 'status',
              options: [
                { label: 'Prospecto', value: 'prospecto' },
                { label: 'Ativo', value: 'ativo' },
              ],
              placeholder: 'Todos',
              type: 'select',
              value: filters.status,
            },
          ]}
          resetHref="/modulos/gkit-new/clientes"
          resultCount={clientesFiltrados.length}
          sort={{
            dir: filters.dir,
            options: [
              { label: 'Nome', value: 'nome' },
              { label: 'Status', value: 'status' },
              { label: 'Contatos', value: 'contatos' },
              { label: 'Oportunidades', value: 'oportunidades' },
            ],
            value: filters.sort,
          }}
          totalCount={clientes.length}
        />
        <GkitNewList
          empty="Nenhum cliente encontrado com os filtros atuais."
          rows={clienteRows(clientesFiltrados)}
        />
      </GkitNewSection>
    </GkitNewShell>
  )
}
