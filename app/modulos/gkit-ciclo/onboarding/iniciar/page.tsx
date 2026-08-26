import Link from 'next/link'
import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { CicloStartOnboardingForm } from '@/features/ciclo/client-picker'
import { CicloSection, CicloShell } from '@/features/ciclo/components'
import { getCicloDocumentoFormData, listCicloOnboardingWorkflowAtividades, requireCicloContext } from '@/features/ciclo/queries'

export default async function CicloIniciarOnboardingPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const context = await requireCicloContext('/modulos/gkit-ciclo/onboarding/iniciar')

  if (!canAccess(context.permissions, 'ciclo.clientes.write')) {
    redirect('/modulos/gkit-ciclo/onboarding')
  }

  const [formData, workflow] = await Promise.all([
    getCicloDocumentoFormData(context),
    listCicloOnboardingWorkflowAtividades(),
  ])
  const rawClienteId = params?.cliente_id
  const initialClienteId = Array.isArray(rawClienteId) ? rawClienteId[0] : rawClienteId

  return (
    <CicloShell
      active="onboarding"
      eyebrow="Operacao"
      title="Iniciar onboarding"
      description="Entrada do cliente na implantação, com checklist documental e workflow operacional."
      actions={<Link className="button secondary" href="/modulos/gkit-ciclo/onboarding">Voltar</Link>}
      usuario={context.usuario}
    >
      <CicloSection hideHeader title="Pacote de onboarding">
        <CicloStartOnboardingForm clientes={formData.clientes} initialClienteId={initialClienteId} workflow={workflow} />
      </CicloSection>
    </CicloShell>
  )
}
