import { redirect } from 'next/navigation'

export default async function GkitFlexUberRedirectPage({
  searchParams,
}: {
  searchParams?: Promise<{ competencia?: string }>
}) {
  const params = await (searchParams ?? Promise.resolve({} as { competencia?: string }))
  const competencia = params.competencia ? `?competencia=${encodeURIComponent(params.competencia)}` : ''
  redirect(`/modulos/gkit-fat/uber${competencia}`)
}
