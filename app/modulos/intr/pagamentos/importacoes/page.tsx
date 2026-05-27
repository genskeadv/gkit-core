import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { IntrShell } from '@/features/intr/components'
import { ImportarRecibosPagamentoForm } from '@/features/intr/importar-recibos-pagamento-form'
import { requireIntrContext } from '@/features/intr/queries'

export default async function IntrPagamentosImportacoesPage() {
  const context = await requireIntrContext()
  const canWrite = canAccess(context.permissions, 'intr.pagamentos.write')

  if (!canWrite) redirect('/modulos/intr/pagamentos')

  return (
    <IntrShell
      active="pagamentos"
      title="Importar recibos"
      description="Preview e gravacao de recibos de pagamento recebidos em PDF."
      usuario={context.usuario}
    >
      <section className="card ciclo-panel">
        <div className="ciclo-panel-heading">
          <div>
            <h2>Recibos CLT e pro-labore</h2>
            <p>O vinculo e feito pelo nome do colaborador ativo no Intr. Recibos ja importados para a mesma competencia sao atualizados.</p>
          </div>
        </div>
        <ImportarRecibosPagamentoForm />
      </section>
    </IntrShell>
  )
}
