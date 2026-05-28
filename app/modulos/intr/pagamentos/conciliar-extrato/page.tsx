import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { ConciliarExtratoOfxForm } from '@/features/intr/conciliar-extrato-ofx-form'
import { IntrShell } from '@/features/intr/components'
import { requireIntrContext } from '@/features/intr/queries'

export default async function IntrConciliarExtratoPage() {
  const context = await requireIntrContext()
  const canWrite = canAccess(context.permissions, 'intr.pagamentos.write')

  if (!canWrite) redirect('/modulos/intr/pagamentos')

  return (
    <IntrShell
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
    </IntrShell>
  )
}
