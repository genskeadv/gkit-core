import { redirect } from 'next/navigation'

type CicloAtendimentoPageProps = {
  searchParams?: Promise<{
    aba?: string
    de?: string
    ate?: string
    status?: string
  }>
}

export default async function CicloAtendimentoPage({ searchParams }: CicloAtendimentoPageProps) {
  const params = await searchParams
  const query = new URLSearchParams()

  for (const key of ['aba', 'de', 'ate', 'status']) {
    const value = params?.[key as 'aba' | 'de' | 'ate' | 'status']
    if (typeof value === 'string' && value) query.set(key, value)
  }

  redirect(`/modulos/gkit-ate/dashboard${query.size ? `?${query.toString()}` : ''}`)
}
