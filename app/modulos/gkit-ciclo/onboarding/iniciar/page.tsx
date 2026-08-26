import Link from 'next/link'
import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { startCicloOnboardingAction } from '@/features/ciclo/actions'
import { CicloShell } from '@/features/ciclo/components'
import { getCicloDocumentoFormData, requireCicloContext } from '@/features/ciclo/queries'

export default async function CicloIniciarOnboardingPage() {
  const context = await requireCicloContext('/modulos/gkit-ciclo/onboarding/iniciar')

  if (!canAccess(context.permissions, 'ciclo.clientes.write')) {
    redirect('/modulos/gkit-ciclo/onboarding')
  }

  const formData = await getCicloDocumentoFormData(context)

  return (
    <CicloShell
      active="onboarding"
      eyebrow="Operacao"
      title="Iniciar onboarding"
      description="Entrada do cliente na implantação, com checklist documental e workflow operacional."
      actions={<Link className="button secondary" href="/modulos/gkit-ciclo/onboarding">Voltar</Link>}
      usuario={context.usuario}
    >
      <section className="suite-panel ciclo-cockpit-form-panel">
        <div className="suite-panel-heading">
          <div>
            <h2>Cliente</h2>
            <p>Digite o nome ou documento e selecione uma opção da lista.</p>
          </div>
        </div>

        <form action={startCicloOnboardingAction} className="card module-form module-form-grid">
          <input name="return_to" type="hidden" value="onboarding" />
          <label className="module-form-wide">
            <span>Cliente</span>
            <input
              autoComplete="off"
              list="ciclo-onboarding-clientes"
              name="cliente_busca"
              placeholder="Digite o cliente"
              required
              title="Selecione um cliente da lista."
              type="search"
            />
            <datalist id="ciclo-onboarding-clientes">
              {formData.clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.label} />
              ))}
            </datalist>
          </label>
          <div className="suite-empty-block module-form-wide">O onboarding cria o checklist documental e o workflow operacional padrão.</div>
          <div className="form-actions module-form-wide">
            <button className="button" type="submit">Iniciar onboarding</button>
          </div>
        </form>
      </section>
    </CicloShell>
  )
}
