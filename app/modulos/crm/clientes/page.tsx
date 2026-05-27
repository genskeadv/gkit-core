import { CrmGenericList, CrmListKpis, CrmShell } from '@/features/crm/components'
import { listCrmClienteRows, requireCrmContext } from '@/features/crm/queries'

export default async function CrmClientesPage() {
  const context = await requireCrmContext()
  const rows = await listCrmClienteRows(context)

  return (
    <CrmShell
      active="clientes"
      eyebrow="Base cadastral"
      title="Clientes"
      description="Clientes e prospectos com documento, carteira, contatos e oportunidades vinculadas."
      usuario={context.usuario}
    >
      <CrmListKpis rows={rows} />
      <CrmGenericList
        title="Base de clientes"
        description="Lista consolidada a partir das entidades comerciais disponiveis no schema CRM."
        emptyLabel="Nenhum cliente encontrado."
        rows={rows}
      />
    </CrmShell>
  )
}
