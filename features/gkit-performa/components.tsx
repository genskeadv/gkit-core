import type { ReactNode } from 'react'
import { ModuleShell, type ModuleNavGroup } from '@/features/shared/module-shell'
import type { PlatformUsuario } from '@/lib/auth/platform'
import { GkitPerformaAnalyzer } from './performa-analyzer'

const navGroups: ModuleNavGroup[] = [
  { href: '/modulos/gkit-performa', title: 'Performance' },
  { href: '/modulos/gkit-performa/auditoria', title: 'Auditoria' },
]

export function GkitPerformaShell({
  active = 'performance',
  children,
  usuario,
}: {
  active?: 'auditoria' | 'performance'
  children: ReactNode
  usuario: PlatformUsuario
}) {
  return (
    <ModuleShell
      activeHref={active === 'auditoria' ? '/modulos/gkit-performa/auditoria' : '/modulos/gkit-performa'}
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

export function GkitPerformaPage({ canSave }: { canSave: boolean }) {
  return <GkitPerformaAnalyzer canSave={canSave} />
}
