import { redirect } from 'next/navigation'

export default async function CicloOnboardingDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/modulos/gkit-ciclo/onboarding/iniciar?cliente_id=${id}`)
}
