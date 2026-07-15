import { redirect } from 'next/navigation'

export default async function GkitJurCockpitUnicoLabRoute({
  searchParams: _searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await _searchParams
  const area = typeof params?.area === 'string' ? params.area : undefined
  redirect(area ? `/modulos/gkit-jur/novo-jur?area=${encodeURIComponent(area)}` : '/modulos/gkit-jur/novo-jur')
}
