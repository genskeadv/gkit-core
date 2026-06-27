import type { ReactNode } from 'react'
import { ModuleShell, type ModuleNavGroup } from '@/features/shared/module-shell'
import type { PlatformUsuario } from '@/lib/auth/platform'
import { GkitPerformaAnalyzer } from './performa-analyzer'

const navGroups: ModuleNavGroup[] = [
  { href: '/modulos/gkit-performa', title: 'Performance' },
]

export function GkitPerformaShell({
  children,
  usuario,
}: {
  children: ReactNode
  usuario: PlatformUsuario
}) {
  return (
    <ModuleShell
      activeHref="/modulos/gkit-performa"
      brand="Performance"
      description="Ranking operacional a partir da agenda, consolidando ATEs e prazos juridicos reais."
      eyebrow="GKIT Performa"
      navGroups={navGroups}
      product="GKIT Performa"
      title="Performance da agenda"
      usuario={usuario}
      variantClassName="gkit-performa-shell gkit-ate-shell"
    >
      {children}
    </ModuleShell>
  )
}

export function GkitPerformaPage() {
  return <GkitPerformaAnalyzer />
}
