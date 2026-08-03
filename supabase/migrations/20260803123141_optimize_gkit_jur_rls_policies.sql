do $$
declare
  policy_config record;
  using_expr text;
  check_expr text;
  insert_policy text;
  update_policy text;
  delete_policy text;
begin
  for policy_config in
    select *
    from (
      values
        ('gkit_jur', 'acordo_lembretes_email', 'acordo_lembretes_email_write_scope'),
        ('gkit_jur', 'acordo_parcelas', 'acordo_parcelas_write_scope'),
        ('gkit_jur', 'acordos_judiciais', 'acordos_judiciais_write_scope'),
        ('gkit_jur', 'agente_arquivos', 'agente_arquivos_write_scope'),
        ('gkit_jur', 'agente_credenciais', 'agente_credenciais_write_scope'),
        ('gkit_jur', 'agente_execucoes', 'agente_execucoes_write_scope'),
        ('gkit_jur', 'agente_fontes', 'agente_fontes_write_scope'),
        ('gkit_jur', 'agente_logs', 'agente_child_write_scope'),
        ('gkit_jur', 'agente_receitas', 'agente_receitas_write_scope'),
        ('gkit_jur', 'agente_resultados', 'agente_resultados_write_scope'),
        ('gkit_jur', 'agente_validacoes', 'agente_validacoes_write_scope'),
        ('gkit_jur', 'documentos', 'documentos_write_scope'),
        ('gkit_jur', 'etiquetas', 'etiquetas_write_scope'),
        ('gkit_jur', 'eventos_processo', 'eventos_processo_write_scope'),
        ('gkit_jur', 'monitoramentos', 'monitoramentos_write_scope'),
        ('gkit_jur', 'movimentacao_tarefa_regras', 'movimentacao_tarefa_regras_write_scope'),
        ('gkit_jur', 'pendencias', 'pendencias_write_scope'),
        ('gkit_jur', 'processo_etiquetas', 'processo_etiquetas_write_scope'),
        ('gkit_jur', 'processos_resumos', 'processos_resumos_write_scope'),
        ('gkit_jur', 'publicacoes_monitoradas', 'publicacoes_monitoradas_write_scope'),
        ('gkit_jur', 'tarefas', 'tarefas_write_scope')
    ) as policies(schema_name, table_name, policy_name)
  loop
    select qual, with_check
      into using_expr, check_expr
    from pg_policies
    where schemaname = policy_config.schema_name
      and tablename = policy_config.table_name
      and policyname = policy_config.policy_name;

    if using_expr is null and check_expr is null then
      continue;
    end if;

    using_expr := coalesce(using_expr, 'true');
    check_expr := coalesce(check_expr, using_expr, 'true');
    insert_policy := replace(policy_config.policy_name, '_write_scope', '_insert_scope');
    update_policy := replace(policy_config.policy_name, '_write_scope', '_update_scope');
    delete_policy := replace(policy_config.policy_name, '_write_scope', '_delete_scope');

    execute format('drop policy if exists %I on %I.%I', policy_config.policy_name, policy_config.schema_name, policy_config.table_name);
    execute format('drop policy if exists %I on %I.%I', insert_policy, policy_config.schema_name, policy_config.table_name);
    execute format('drop policy if exists %I on %I.%I', update_policy, policy_config.schema_name, policy_config.table_name);
    execute format('drop policy if exists %I on %I.%I', delete_policy, policy_config.schema_name, policy_config.table_name);

    execute format(
      'create policy %I on %I.%I for insert to authenticated with check (%s)',
      insert_policy,
      policy_config.schema_name,
      policy_config.table_name,
      check_expr
    );

    execute format(
      'create policy %I on %I.%I for update to authenticated using (%s) with check (%s)',
      update_policy,
      policy_config.schema_name,
      policy_config.table_name,
      using_expr,
      check_expr
    );

    execute format(
      'create policy %I on %I.%I for delete to authenticated using (%s)',
      delete_policy,
      policy_config.schema_name,
      policy_config.table_name,
      using_expr
    );
  end loop;
end $$;
