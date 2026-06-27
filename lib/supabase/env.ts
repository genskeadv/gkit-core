export function getSupabasePublicEnv() {
  const supabaseUrl = cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL)
  const supabaseKey = cleanEnvValue(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  )

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Env ausente: NEXT_PUBLIC_SUPABASE_URL ou chave publica do Supabase.')
  }

  return { supabaseKey, supabaseUrl }
}

export function cleanEnvValue(value: string | undefined) {
  return value?.replace(/^\uFEFF/, '').trim()
}
