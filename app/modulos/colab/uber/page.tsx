import { ColabIntegrationStatus, ColabProfile, ColabShell, ColabUberExpenses } from '@/features/colab/components'
import { createColabUberExpenseAction } from '@/features/colab/actions'
import { getColabData, getColabUberData, requireColabContext } from '@/features/colab/queries'

export default async function ColabUberPage({
  searchParams,
}: {
  searchParams?: Promise<{ ok?: string; erro?: string }>
}) {
  const context = await requireColabContext()
  const [data, uberData, params] = await Promise.all([
    getColabData(context.usuario.email),
    getColabUberData(context.usuario.email),
    searchParams ?? Promise.resolve({} as { ok?: string; erro?: string }),
  ])

  return (
    <ColabShell
      active="uber"
      title="Despesas de Uber"
      description="Lançamento de corridas vinculadas a clientes do Ciclo, com recibo para pedido de reembolso."
      usuario={context.usuario}
    >
      <ColabIntegrationStatus data={data} />
      <ColabProfile data={data} />
      <ColabUberExpenses
        action={createColabUberExpenseAction}
        data={uberData}
        error={params.erro}
        success={params.ok === '1'}
      />
    </ColabShell>
  )
}
