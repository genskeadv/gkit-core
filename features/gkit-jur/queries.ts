import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { requireModuleAccess } from '@/lib/auth/platform'

export async function requireGkitJurContext(target = '/modulos/gkit-jur') {
  const context = await requireModuleAccess('gkit-jur', target)

  if (!canAccess(context.permissions, 'gkit_jur.dashboard.read')) {
    redirect('/plataforma')
  }

  return context
}
