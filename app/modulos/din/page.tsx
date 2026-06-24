import { ModuleShell, type ModuleNavGroup } from '@/features/shared/module-shell'
import { DinProcessor } from '@/features/din/processor'
import { requireModuleAccess } from '@/lib/auth/platform'

const navGroups: ModuleNavGroup[] = [
  { href: '/modulos/din', title: 'Cockpit' },
]

export default async function DinPage() {
  const context = await requireModuleAccess('din')

  return (
    <ModuleShell
      activeHref="/modulos/din"
      brand="Faturamento"
      description="Processamento de repasses mensais, clientes do ciclo e exportacao Omie."
      eyebrow="GKIT DIN"
      navGroups={navGroups}
      product="GKIT DIN"
      title="Faturamento mensal"
      usuario={context.usuario}
      variantClassName="flex-shell din-shell"
    >
      <DinProcessor usuarioNome={context.usuario.nome} />
    </ModuleShell>
  )
}
