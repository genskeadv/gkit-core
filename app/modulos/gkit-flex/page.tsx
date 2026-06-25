import { redirect } from 'next/navigation'
import { requireModuleAccess } from '@/lib/auth/platform'

function gkitFlexUrl() {
  const configuredUrl = process.env.GKIT_FLEX_URL ?? process.env.NEXT_PUBLIC_GKIT_FLEX_URL
  return configuredUrl && configuredUrl.trim().length > 0 ? configuredUrl : 'http://localhost:3012'
}

export default async function GkitFlexBridgePage() {
  await requireModuleAccess('gkit-flex', '/modulos/gkit-flex')
  redirect(gkitFlexUrl())
}
