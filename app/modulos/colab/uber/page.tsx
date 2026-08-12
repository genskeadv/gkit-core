import { ColabShell, ColabUberExpenses } from '@/features/colab/components'
import { createColabUberExpenseAction } from '@/features/colab/actions'
import { getColabUberData, requireColabContext } from '@/features/colab/queries'
import { canAccess } from '@/lib/auth/permissions'

export default async function ColabUberPage({
  searchParams,
}: {
  searchParams?: Promise<{ ok?: string; erro?: string }>
}) {
  const context = await requireColabContext()
  const [uberData, params] = await Promise.all([
    getColabUberData(context.usuario.email, canAccess(context.permissions, 'colab.uber.write')),
    searchParams ?? Promise.resolve({} as { ok?: string; erro?: string }),
  ])

  return (
    <ColabShell
      active="uber"
      title="Despesas de Uber"
      description="Lancamento de corridas vinculadas a clientes do Ciclo, com recibo ou quilometragem para reembolso."
      usuario={context.usuario}
    >
      <ColabUberExpenses
        action={createColabUberExpenseAction}
        data={uberData}
        error={params.erro}
        success={params.ok === '1'}
      />
    </ColabShell>
  )
}
