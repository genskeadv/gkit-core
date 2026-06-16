import { redirect } from 'next/navigation'

export default async function LegacyIntrRedirectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/modulos/fix/times/${id}`)
}
