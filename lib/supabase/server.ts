import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabasePublicEnv } from '@/lib/supabase/env'

export async function createClient() {
  const cookieStore = await cookies()
  const { supabaseKey, supabaseUrl } = getSupabasePublicEnv()

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Server Components cannot set cookies directly; middleware refresh covers them.
        }
      },
    },
  })
}

export async function createSupabaseServerClient() {
  return createClient()
}
