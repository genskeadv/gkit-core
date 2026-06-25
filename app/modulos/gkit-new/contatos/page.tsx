import Link from 'next/link'
import { GkitNewFilterBar, GkitNewHealthNotice, GkitNewList, GkitNewSection, GkitNewShell } from '@/features/gkit-new/components'
import { buildGkitNewContatoFilters, filterGkitNewContatos } from '@/features/gkit-new/list-filters'
import { canWriteGkitNew, contatoRows, getGkitNewHealth, listGkitNewContatos, requireGkitNewContext } from '@/features/gkit-new/queries'
import { moduleTarget } from '@/lib/auth/platform'

export default async function GkitNewContatosPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const context = await requireGkitNewContext(moduleTarget('/modulos/gkit-new/contatos', params))
  const [health, contatos] = await Promise.all([getGkitNewHealth(), listGkitNewContatos()])
  const canWrite = canWriteGkitNew(context.permissions, 'gkit_new.contatos.write')
  const filters = buildGkitNewContatoFilters(params)
  const contatosFiltrados = filterGkitNewContatos(contatos, filters)

  return (
    <GkitNewShell
      active="contatos"
      title="Contatos"
      description="Pessoas de relacionamento comercial vinculaveis a varios clientes."
      usuario={context.usuario}
      actions={canWrite ? <Link className="button" href="/modulos/gkit-new/contatos/novo">Novo contato</Link> : null}
    >
      <GkitNewHealthNotice health={health} />
      <GkitNewSection title="Base de contatos" description="Contato x cliente em relacao N para N.">
        <GkitNewFilterBar
          fields={[
            { label: 'Busca', name: 'q', placeholder: 'Nome, e-mail, celular ou descricao', value: filters.q },
            {
              label: 'Vinculo',
              name: 'vinculo',
              options: [
                { label: 'Com clientes', value: 'com_clientes' },
                { label: 'Sem clientes', value: 'sem_clientes' },
              ],
              placeholder: 'Todos',
              type: 'select',
              value: filters.vinculo,
            },
          ]}
          resetHref="/modulos/gkit-new/contatos"
          resultCount={contatosFiltrados.length}
          sort={{
            dir: filters.dir,
            options: [
              { label: 'Nome', value: 'nome' },
              { label: 'Clientes vinculados', value: 'clientes' },
            ],
            value: filters.sort,
          }}
          totalCount={contatos.length}
        />
        <GkitNewList
          empty="Nenhum contato encontrado com os filtros atuais."
          rows={contatoRows(contatosFiltrados)}
        />
      </GkitNewSection>
    </GkitNewShell>
  )
}
