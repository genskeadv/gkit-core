import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { requireModuleAccess } from '@/lib/auth/platform'

export async function requireGkitPerformaContext(target = '/modulos/gkit-performa') {
  const context = await requireModuleAccess('gkit-performa', target)

  if (!canAccess(context.permissions, 'gkit_performa.dashboard.read')) {
    redirect('/plataforma')
  }

  return context
}
