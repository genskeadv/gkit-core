import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { FixShell } from '@/features/fix/components'
import { ImportarRecibosPagamentoForm } from '@/features/fix/importar-recibos-pagamento-form'
import { requireIntrContext } from '@/features/fix/queries'

export default async function IntrPagamentosImportacoesPage() {
  const context = await requireIntrContext()
  const canWrite = canAccess(context.permissions, 'intr.pagamentos.write')

  if (!canWrite) redirect('/modulos/fix/pagamentos')

  return (
    <FixShell
      active="pagamentos"
      title="Importar recibos"
      description="Preview e gravacao de recibos de pagamento recebidos em PDF."
      usuario={context.usuario}
    >
      <section className="card ciclo-panel">
        <div className="ciclo-panel-heading">
          <div>
            <h2>Recibos CLT e pro-labore</h2>
            <p>O vinculo e feito pelo nome do colaborador ativo no FIX. Recibos ja importados para a mesma competencia sao atualizados.</p>
          </div>
        </div>
        <ImportarRecibosPagamentoForm />
      </section>
    </FixShell>
  )
}
