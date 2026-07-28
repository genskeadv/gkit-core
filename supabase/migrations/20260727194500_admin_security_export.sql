begin;

create or replace function security.exportar_backup_app()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  target_schemas text[] := array[
    'public',
    'audit',
    'core',
    'security',
    'ciclo',
    'gkit_new',
    'gkit_ate',
    'gkit_performa',
    'gkit_jur',
    'gkit_fat'
  ];
  table_item record;
  table_rows jsonb;
  table_count bigint;
  data_map jsonb := '{}'::jsonb;
  count_map jsonb := '{}'::jsonb;
  applied_migrations jsonb := '[]'::jsonb;
begin
  if coalesce(pg_catalog.current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception 'Funcao restrita ao service_role.';
  end if;

  if pg_catalog.to_regclass('supabase_migrations.schema_migrations') is not null then
    execute
      'select coalesce(jsonb_agg(version order by version), ''[]''::jsonb) from supabase_migrations.schema_migrations'
      into applied_migrations;
  end if;

  for table_item in
    select n.nspname as schema_name, c.relname as table_name
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = any(target_schemas)
      and c.relkind in ('r', 'p')
    order by n.nspname, c.relname
  loop
    execute pg_catalog.format(
      'select count(*)::bigint from %I.%I',
      table_item.schema_name,
      table_item.table_name
    )
    into table_count;

    execute pg_catalog.format(
      'select coalesce(jsonb_agg(to_jsonb(row_data)), ''[]''::jsonb) from (select * from %I.%I) row_data',
      table_item.schema_name,
      table_item.table_name
    )
    into table_rows;

    data_map := data_map || pg_catalog.jsonb_build_object(table_item.schema_name || '.' || table_item.table_name, table_rows);
    count_map := count_map || pg_catalog.jsonb_build_object(table_item.schema_name || '.' || table_item.table_name, table_count);
  end loop;

  return pg_catalog.jsonb_build_object(
    'generated_at', pg_catalog.now(),
    'target_schemas', pg_catalog.to_jsonb(target_schemas),
    'applied_migrations', applied_migrations,
    'schema', pg_catalog.jsonb_build_object(
      'schemas', (
        select coalesce(
          pg_catalog.jsonb_agg(
            pg_catalog.jsonb_build_object(
              'name', n.nspname,
              'owner', pg_catalog.pg_get_userbyid(n.nspowner)
            )
            order by n.nspname
          ),
          '[]'::jsonb
        )
        from pg_catalog.pg_namespace n
        where n.nspname = any(target_schemas)
      ),
      'extensions', (
        select coalesce(
          pg_catalog.jsonb_agg(
            pg_catalog.jsonb_build_object(
              'name', e.extname,
              'schema', ns.nspname,
              'version', e.extversion
            )
            order by e.extname
          ),
          '[]'::jsonb
        )
        from pg_catalog.pg_extension e
        join pg_catalog.pg_namespace ns on ns.oid = e.extnamespace
      ),
      'tables', (
        select coalesce(
          pg_catalog.jsonb_agg(
            pg_catalog.jsonb_build_object(
              'schema', n.nspname,
              'name', c.relname,
              'kind', case c.relkind when 'p' then 'partitioned_table' else 'table' end,
              'owner', pg_catalog.pg_get_userbyid(c.relowner),
              'rls_enabled', c.relrowsecurity,
              'rls_forced', c.relforcerowsecurity,
              'columns', (
                select coalesce(
                  pg_catalog.jsonb_agg(
                    pg_catalog.jsonb_build_object(
                      'name', a.attname,
                      'position', a.attnum,
                      'type', pg_catalog.format_type(a.atttypid, a.atttypmod),
                      'not_null', a.attnotnull,
                      'default', pg_catalog.pg_get_expr(d.adbin, d.adrelid),
                      'identity', a.attidentity,
                      'generated', a.attgenerated
                    )
                    order by a.attnum
                  ),
                  '[]'::jsonb
                )
                from pg_catalog.pg_attribute a
                left join pg_catalog.pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
                where a.attrelid = c.oid
                  and a.attnum > 0
                  and not a.attisdropped
              ),
              'constraints', (
                select coalesce(
                  pg_catalog.jsonb_agg(
                    pg_catalog.jsonb_build_object(
                      'name', con.conname,
                      'type', con.contype,
                      'definition', pg_catalog.pg_get_constraintdef(con.oid, true)
                    )
                    order by con.conname
                  ),
                  '[]'::jsonb
                )
                from pg_catalog.pg_constraint con
                where con.conrelid = c.oid
              ),
              'indexes', (
                select coalesce(
                  pg_catalog.jsonb_agg(
                    pg_catalog.jsonb_build_object(
                      'name', idx.indexname,
                      'definition', idx.indexdef
                    )
                    order by idx.indexname
                  ),
                  '[]'::jsonb
                )
                from pg_catalog.pg_indexes idx
                where idx.schemaname = n.nspname
                  and idx.tablename = c.relname
              ),
              'triggers', (
                select coalesce(
                  pg_catalog.jsonb_agg(
                    pg_catalog.jsonb_build_object(
                      'name', t.tgname,
                      'definition', pg_catalog.pg_get_triggerdef(t.oid, true)
                    )
                    order by t.tgname
                  ),
                  '[]'::jsonb
                )
                from pg_catalog.pg_trigger t
                where t.tgrelid = c.oid
                  and not t.tgisinternal
              ),
              'policies', (
                select coalesce(
                  pg_catalog.jsonb_agg(
                    pg_catalog.jsonb_build_object(
                      'name', p.policyname,
                      'command', p.cmd,
                      'roles', p.roles,
                      'using', p.qual,
                      'with_check', p.with_check
                    )
                    order by p.policyname
                  ),
                  '[]'::jsonb
                )
                from pg_catalog.pg_policies p
                where p.schemaname = n.nspname
                  and p.tablename = c.relname
              )
            )
            order by n.nspname, c.relname
          ),
          '[]'::jsonb
        )
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        where n.nspname = any(target_schemas)
          and c.relkind in ('r', 'p')
      ),
      'views', (
        select coalesce(
          pg_catalog.jsonb_agg(
            pg_catalog.jsonb_build_object(
              'schema', n.nspname,
              'name', c.relname,
              'kind', case c.relkind when 'm' then 'materialized_view' else 'view' end,
              'definition', pg_catalog.pg_get_viewdef(c.oid, true)
            )
            order by n.nspname, c.relname
          ),
          '[]'::jsonb
        )
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        where n.nspname = any(target_schemas)
          and c.relkind in ('v', 'm')
      ),
      'functions', (
        select coalesce(
          pg_catalog.jsonb_agg(
            pg_catalog.jsonb_build_object(
              'schema', n.nspname,
              'name', p.proname,
              'identity_arguments', pg_catalog.pg_get_function_identity_arguments(p.oid),
              'definition', pg_catalog.pg_get_functiondef(p.oid)
            )
            order by n.nspname, p.proname, pg_catalog.pg_get_function_identity_arguments(p.oid)
          ),
          '[]'::jsonb
        )
        from pg_catalog.pg_proc p
        join pg_catalog.pg_namespace n on n.oid = p.pronamespace
        where n.nspname = any(target_schemas)
          and p.prokind in ('f', 'p')
      )
    ),
    'row_counts', count_map,
    'data', data_map,
    'restore_notes', pg_catalog.to_jsonb(array[
      'Execute as migrations do repositorio antes de importar dados.',
      'Usuarios do Supabase Auth devem ser recriados ou recuperados separadamente; este arquivo preserva os vinculos em security.usuarios.',
      'O arquivo pode conter dados pessoais e credenciais operacionais. Armazene fora de canais publicos.'
    ])
  );
end;
$function$;

revoke all on function security.exportar_backup_app() from public, anon, authenticated;
grant execute on function security.exportar_backup_app() to service_role;

notify pgrst, 'reload schema';

commit;
