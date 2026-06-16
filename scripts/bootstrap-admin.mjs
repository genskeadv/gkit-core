import { createClient } from '@supabase/supabase-js'
import { readArg, readLocalEnv } from './env.mjs'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const emailPattern = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i

function fail(message) {
  console.log(JSON.stringify({ ok: false, message }, null, 2))
  process.exitCode = 1
}

const env = readLocalEnv()
const authId = readArg('auth-id')
const email = readArg('email').toLowerCase()
const name = readArg('name') || 'Administrador GKIT'
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  fail('Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local.')
} else if (!uuidPattern.test(authId)) {
  fail('Informe o UUID do usuário Auth com --auth-id=UUID.')
} else if (!emailPattern.test(email)) {
  fail('Informe um e-mail válido com --email=email@dominio.com.')
} else {
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  const { error: usuarioError } = await supabase.schema('security').from('usuarios').upsert({
    id: authId,
    nome: name,
    email,
    tipo: 'admin_global',
    status: 'ativo',
    updated_at: new Date().toISOString(),
  }, {
    onConflict: 'id',
  })

  if (usuarioError) {
    fail(usuarioError.message)
  } else {
    const { data: apps, error: appsError } = await supabase
      .schema('core')
      .from('apps')
      .select('id,codigo')
      .eq('status', 'ativo')

    if (appsError) {
      fail(appsError.message)
    } else {
      const appRows = (apps ?? []).map((app) => ({
        usuario_id: authId,
        app_id: app.id,
        ativo: true,
      }))

      if (appRows.length) {
        const { error: appAccessError } = await supabase
          .schema('security')
          .from('usuario_app_acessos')
          .upsert(appRows, {
            onConflict: 'usuario_id,app_id',
          })

        if (appAccessError) {
          fail(appAccessError.message)
        }
      }

      if (!process.exitCode) {
        console.log(JSON.stringify({
          ok: true,
          admin: {
            id: authId,
            email,
            nome: name,
            tipo: 'admin_global',
            status: 'ativo',
          },
          modulesGranted: (apps ?? []).map((app) => app.codigo),
          nextStep: 'Acesse /login com esse usuário e entre no portal.',
        }, null, 2))
      }
    }
  }
}
