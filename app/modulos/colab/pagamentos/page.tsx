import { ColabPayments, ColabShell } from '@/features/colab/components'
import { getColabData, requireColabContext } from '@/features/colab/queries'

export default async function ColabPagamentosPage() {
  const context = await requireColabContext()
  const data = await getColabData(context.usuario.email)

  return (
    <ColabShell
      active="pagamentos"
      title="Pagamentos"
      description="Demonstrativos de pagamento do colaborador logado."
      usuario={context.usuario}
    >
      <ColabPayments data={data} />
    </ColabShell>
  )
}
