import { ColabPayments, ColabShell } from '@/features/colab/components'
import { getColabData, requireColabContext } from '@/features/colab/queries'

type ColabPagamentosSearchParams = {
  competencia?: string | string[]
  status?: string | string[]
}

function firstParam(value: string | string[] | undefined, fallback = 'todos') {
  if (Array.isArray(value)) return value[0] || fallback
  return value || fallback
}

export default async function ColabPagamentosPage({
  searchParams,
}: {
  searchParams?: Promise<ColabPagamentosSearchParams>
}) {
  const params = await searchParams
  const context = await requireColabContext()
  const data = await getColabData(context.usuario.email)
  const statusFilter = firstParam(params?.status)
  const competenceFilter = firstParam(params?.competencia)

  return (
    <ColabShell
      active="pagamentos"
      title="Pagamentos"
      description="Demonstrativos de pagamento do colaborador logado."
      usuario={context.usuario}
    >
      <ColabPayments competenceFilter={competenceFilter} data={data} statusFilter={statusFilter} />
    </ColabShell>
  )
}
