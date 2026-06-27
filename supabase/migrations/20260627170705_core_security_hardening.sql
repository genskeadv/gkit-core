begin;

-- Reforca a consolidacao DIN como superficie financeira canonica.
insert into core.apps (codigo, nome, descricao, status, url_path, ordem)
values (
  'din',
  'GKIT DIN',
  'Faturamento mensal: repasses, clientes do ciclo e exportacao Omie.',
  'ativo'::core.status_registro,
  '/modulos/din',
  45
)
on conflict (codigo) do update
set
  nome = excluded.nome,
  descricao = excluded.descricao,
  status = excluded.status,
  url_path = excluded.url_path,
  ordem = excluded.ordem,
  updated_at = now();

update core.apps
set
  status = 'inativo'::core.status_registro,
  url_path = '/modulos/din',
  updated_at = now()
where codigo in ('intr', 'fix', 'flex');

-- Menor privilegio: o browser anonimo nao precisa enxergar schemas operacionais.
revoke all privileges on all tables in schema public from anon;
revoke all privileges on all sequences in schema public from anon;
revoke all privileges on all functions in schema public from anon;
revoke usage on schema gkit_new from anon;
revoke all privileges on all tables in schema gkit_new from anon;
revoke all privileges on all sequences in schema gkit_new from anon;
revoke all privileges on all functions in schema gkit_new from anon;

-- Mantem o Data API funcional para usuarios autenticados, com RLS governando linhas.
grant usage on schema gkit_new to authenticated, service_role;
grant select, insert, update, delete on all tables in schema gkit_new to authenticated, service_role;
grant usage, select on all sequences in schema gkit_new to authenticated, service_role;

-- Em Postgres 15+, security_invoker evita que views contornem RLS do chamador.
alter view if exists gkit_new.v_clientes_resumo set (security_invoker = true);
alter view if exists gkit_new.v_oportunidades_resumo set (security_invoker = true);
alter view if exists gkit_new.v_produtividade_responsavel set (security_invoker = true);
alter view if exists gkit_new.v_tarefas_pendentes set (security_invoker = true);

alter view if exists public.gkli_intr_fix_despesas_realizadas_resumo set (security_invoker = true);
alter view if exists public.gkli_intr_fix_despesas_recorrentes_resumo set (security_invoker = true);
alter view if exists public.gkli_intr_fix_contas_pagar_resumo set (security_invoker = true);
alter view if exists public.gkli_intr_fix_previsao_resumo set (security_invoker = true);
alter view if exists public.gkit_fix_comissoes_aprovacao_resumo set (security_invoker = true);
alter view if exists public.gkli_intr_fix_previsao_macrogrupo_resumo set (security_invoker = true);
alter view if exists public.gkli_intr_fix_extrato_importacoes_resumo set (security_invoker = true);
alter view if exists public.gkli_intr_fix_macrogrupos_resumo set (security_invoker = true);
alter view if exists public.gkli_intr_fix_inteligencia_resumo set (security_invoker = true);
alter view if exists public.gkli_intr_fix_orcamento_despesas_resumo set (security_invoker = true);
alter view if exists public.gkli_intr_fix_sugestoes_resumo set (security_invoker = true);
alter view if exists public.gkli_intr_fix_extrato_lancamentos_resumo set (security_invoker = true);
alter view if exists public.gkit_fix_fechamento_checklist_resumo set (security_invoker = true);
alter view if exists public.gkli_intr_fix_conciliacao_resumo set (security_invoker = true);
alter view if exists public.gkli_intr_fix_validacao_despesas_resumo set (security_invoker = true);

-- Fixa search_path em funcoes sinalizadas pelo advisor.
do $$
declare
  item record;
begin
  for item in
    select *
    from (
      values
        ('core.normalize_text(text)', 'core, pg_temp'),
        ('core.only_digits(text)', 'core, pg_temp'),
        ('core.set_updated_at()', 'core, pg_temp'),
        ('core.set_atualizado_em()', 'core, pg_temp'),
        ('security.current_usuario_id()', 'security, pg_temp'),
        ('public.gkli_intr_upsert_time(text)', 'public, pg_temp'),
        ('public.gkli_intr_normalizar_texto(text)', 'public, pg_temp'),
        ('gkli_intr.fix_normalize_text(text)', 'gkli_intr, pg_temp'),
        ('gkli_intr.fix_competencia_mes(date)', 'gkli_intr, pg_temp'),
        ('gkli_intr.fix_categoria_por_tipo_pagamento(text)', 'gkli_intr, pg_temp'),
        ('gkli_intr.fix_gerar_previsao_mensal(date)', 'gkli_intr, pg_temp')
    ) as functions(signature, search_path)
  loop
    if to_regprocedure(item.signature) is not null then
      execute format('alter function %s set search_path = %s', item.signature, item.search_path);
    end if;
  end loop;
end $$;

-- Completa o hardening para funcoes proprias que o advisor encontrar depois.
do $$
declare
  fn record;
begin
  for fn in
    select
      n.nspname as schema_name,
      p.proname as function_name,
      pg_get_function_identity_arguments(p.oid) as identity_args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('core', 'security', 'gkli_intr', 'flex', 'gkit_new', 'gkit_ate', 'gkit_performa')
      and p.prokind in ('f', 'p')
  loop
    execute format(
      'alter function %I.%I(%s) set search_path = %I, pg_temp',
      fn.schema_name,
      fn.function_name,
      fn.identity_args,
      fn.schema_name
    );
  end loop;
end $$;

do $$
declare
  fn record;
begin
  for fn in
    select
      n.nspname as schema_name,
      p.proname as function_name,
      pg_get_function_identity_arguments(p.oid) as identity_args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where p.prosecdef = true
      and (
        (n.nspname = 'gkli_intr' and p.proname like 'fix_%')
        or (n.nspname = 'public' and p.proname in ('gkli_intr_importar_receitas', 'gkli_intr_upsert_time', 'rls_auto_enable'))
        or (n.nspname = 'security' and p.proname in ('is_admin_global', 'usuario_tem_app', 'usuario_tem_carteira', 'usuario_tem_permissao'))
      )
  loop
    execute format(
      'alter function %I.%I(%s) set search_path = %I, pg_temp',
      fn.schema_name,
      fn.function_name,
      fn.identity_args,
      fn.schema_name
    );
    execute format(
      'revoke execute on function %I.%I(%s) from public, anon, authenticated',
      fn.schema_name,
      fn.function_name,
      fn.identity_args
    );
    execute format(
      'grant execute on function %I.%I(%s) to service_role',
      fn.schema_name,
      fn.function_name,
      fn.identity_args
    );
  end loop;
end $$;

-- Remove indices/constraints duplicados apontados pelo advisor.
alter table if exists gkit_ate.atendimentos
  drop constraint if exists atendimentos_codigo_publico_key;

drop index if exists gkli_intr.financeiro_categorias_codigo_uidx;

notify pgrst, 'reload schema';

commit;
