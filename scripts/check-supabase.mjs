import { createClient } from '@supabase/supabase-js'
import { readLocalEnv } from './env.mjs'

function summarize(result) {
  if (result.error) {
    return {
      ok: false,
      code: result.error.code ?? null,
      message: result.error.message || 'Sem mensagem retornada pelo Supabase.',
    }
  }

  return {
    ok: true,
    count: result.count ?? result.data?.length ?? null,
    data: result.data ?? null,
  }
}

function summarizeOptional(result, message) {
  const summary = summarize(result)
  if (!summary.ok && summary.message === 'Sem mensagem retornada pelo Supabase.') {
    summary.message = message
  }
  return { optional: true, ...summary }
}

const env = readLocalEnv()
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.log(JSON.stringify({
    ok: false,
    stage: 'env',
    message: 'Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local.',
  }, null, 2))
  process.exitCode = 1
} else {
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  const [apps, usuarios, eventos, crmEmpresas, crmOportunidades, cicloClientes, cicloDocumentos] = await Promise.all([
    supabase.schema('core').from('apps').select('codigo,nome,status,ordem').order('ordem', { ascending: true }),
    supabase.schema('security').from('usuarios').select('id', { count: 'exact', head: true }),
    supabase.schema('audit').from('eventos').select('id', { count: 'exact', head: true }),
    supabase.schema('crm').from('empresas').select('id', { count: 'exact', head: true }),
    supabase.schema('crm').from('oportunidades').select('id', { count: 'exact', head: true }),
    supabase.schema('ciclo').from('clientes').select('id', { count: 'exact', head: true }),
    supabase.schema('ciclo').from('cliente_documentos').select('id', { count: 'exact', head: true }),
  ])

  const report = {
    ok: !apps.error && !usuarios.error && !eventos.error,
    schemas: {
      core_apps: summarize(apps),
      security_usuarios: summarize(usuarios),
      audit_eventos: summarize(eventos),
      crm_empresas: summarizeOptional(crmEmpresas, 'Schema/tabela CRM ainda não disponível. Execute sql/03_crm_p1.sql e exponha o schema crm.'),
      crm_oportunidades: summarizeOptional(crmOportunidades, 'Schema/tabela CRM ainda não disponível. Execute sql/03_crm_p1.sql e exponha o schema crm.'),
      ciclo_clientes: summarizeOptional(cicloClientes, 'Schema/tabela Ciclo ainda não disponível. Execute sql/04_ciclo_p1.sql e exponha o schema ciclo.'),
      ciclo_documentos: summarizeOptional(cicloDocumentos, 'Schema/tabela Ciclo ainda não disponível. Execute sql/04_ciclo_p1.sql e exponha o schema ciclo.'),
    },
  }

  if (apps.error?.code === 'PGRST106') {
    report.nextStep = 'No Supabase, abra Project Settings > API e adicione public, core, security e audit em Exposed schemas. Depois rode npm run check:supabase novamente.'
  } else if (!usuarios.error && usuarios.count === 0) {
    report.nextStep = 'Crie um usuário em Authentication > Users e rode npm run bootstrap:admin -- --auth-id=UUID --email=email --name="Nome".'
  }

console.log(JSON.stringify(report, null, 2))
process.exitCode = report.ok ? 0 : 1
}
