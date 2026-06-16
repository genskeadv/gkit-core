import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { ConciliarExtratoOfxForm } from '@/features/fix/conciliar-extrato-ofx-form'
import { FixShell } from '@/features/fix/components'
import { requireIntrContext } from '@/features/fix/queries'

export default async function IntrConciliarExtratoPage() {
  const context = await requireIntrContext()
  const canWrite = canAccess(context.permissions, 'intr.pagamentos.write')

  if (!canWrite) redirect('/modulos/fix/pagamentos')

  return (
    <FixShell
      active="pagamentos"
      title="Conciliar extrato"
      description="Importe um OFX para bater saidas bancarias por colaborador contra pagamentos previstos."
      usuario={context.usuario}
    >
      <section className="card ciclo-panel">
        <div className="ciclo-panel-heading">
          <div>
            <h2>Extrato OFX</h2>
            <p>A conciliacao e opcional: primeiro veja a previa por colaborador, depois confirme para marcar pagamentos previstos como pagos.</p>
          </div>
        </div>
        <ConciliarExtratoOfxForm />
      </section>
    </FixShell>
  )
}
