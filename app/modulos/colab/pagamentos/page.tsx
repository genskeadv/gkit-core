import { ColabIntegrationStatus, ColabPayments, ColabProfile, ColabShell } from '@/features/colab/components'
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
      <ColabIntegrationStatus data={data} />
      <ColabProfile data={data} />
      <ColabPayments data={data} />
    </ColabShell>
  )
}
