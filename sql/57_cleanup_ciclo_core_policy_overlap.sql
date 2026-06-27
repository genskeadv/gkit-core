-- Remove duplicate permissive SELECT paths by replacing broad ALL write policies
-- with command-specific INSERT/UPDATE/DELETE policies.

drop policy if exists administradoras_write_ciclo on ciclo.administradoras;
drop policy if exists administradoras_write_ciclo_insert on ciclo.administradoras;
drop policy if exists administradoras_write_ciclo_update on ciclo.administradoras;
drop policy if exists administradoras_write_ciclo_delete on ciclo.administradoras;
create policy administradoras_write_ciclo_insert on ciclo.administradoras
  for insert to authenticated
  with check (security.usuario_tem_permissao('ciclo.clientes.write'));
create policy administradoras_write_ciclo_update on ciclo.administradoras
  for update to authenticated
  using (security.usuario_tem_permissao('ciclo.clientes.write'))
  with check (security.usuario_tem_permissao('ciclo.clientes.write'));
create policy administradoras_write_ciclo_delete on ciclo.administradoras
  for delete to authenticated
  using (security.usuario_tem_permissao('ciclo.clientes.write'));

drop policy if exists alertas_write_ciclo_scope on ciclo.alertas_cliente;
drop policy if exists alertas_write_ciclo_scope_insert on ciclo.alertas_cliente;
drop policy if exists alertas_write_ciclo_scope_update on ciclo.alertas_cliente;
drop policy if exists alertas_write_ciclo_scope_delete on ciclo.alertas_cliente;
create policy alertas_write_ciclo_scope_insert on ciclo.alertas_cliente
  for insert to authenticated
  with check (
    security.usuario_tem_permissao('ciclo.alertas.write')
    and security.usuario_tem_carteira(carteira_id)
  );
create policy alertas_write_ciclo_scope_update on ciclo.alertas_cliente
  for update to authenticated
  using (
    security.usuario_tem_permissao('ciclo.alertas.write')
    and security.usuario_tem_carteira(carteira_id)
  )
  with check (
    security.usuario_tem_permissao('ciclo.alertas.write')
    and security.usuario_tem_carteira(carteira_id)
  );
create policy alertas_write_ciclo_scope_delete on ciclo.alertas_cliente
  for delete to authenticated
  using (
    security.usuario_tem_permissao('ciclo.alertas.write')
    and security.usuario_tem_carteira(carteira_id)
  );

drop policy if exists atas_write_ciclo_scope on ciclo.atas;
drop policy if exists atas_write_ciclo_scope_insert on ciclo.atas;
drop policy if exists atas_write_ciclo_scope_update on ciclo.atas;
drop policy if exists atas_write_ciclo_scope_delete on ciclo.atas;
create policy atas_write_ciclo_scope_insert on ciclo.atas
  for insert to authenticated
  with check (
    security.usuario_tem_permissao('ciclo.clientes.write')
    and security.usuario_tem_carteira(carteira_id)
  );
create policy atas_write_ciclo_scope_update on ciclo.atas
  for update to authenticated
  using (
    security.usuario_tem_permissao('ciclo.clientes.write')
    and security.usuario_tem_carteira(carteira_id)
  )
  with check (
    security.usuario_tem_permissao('ciclo.clientes.write')
    and security.usuario_tem_carteira(carteira_id)
  );
create policy atas_write_ciclo_scope_delete on ciclo.atas
  for delete to authenticated
  using (
    security.usuario_tem_permissao('ciclo.clientes.write')
    and security.usuario_tem_carteira(carteira_id)
  );

drop policy if exists cliente_contatos_write_ciclo on ciclo.cliente_contatos;
drop policy if exists cliente_contatos_write_ciclo_insert on ciclo.cliente_contatos;
drop policy if exists cliente_contatos_write_ciclo_update on ciclo.cliente_contatos;
drop policy if exists cliente_contatos_write_ciclo_delete on ciclo.cliente_contatos;
create policy cliente_contatos_write_ciclo_insert on ciclo.cliente_contatos
  for insert to authenticated
  with check (security.usuario_tem_permissao('ciclo.clientes.write'));
create policy cliente_contatos_write_ciclo_update on ciclo.cliente_contatos
  for update to authenticated
  using (security.usuario_tem_permissao('ciclo.clientes.write'))
  with check (security.usuario_tem_permissao('ciclo.clientes.write'));
create policy cliente_contatos_write_ciclo_delete on ciclo.cliente_contatos
  for delete to authenticated
  using (security.usuario_tem_permissao('ciclo.clientes.write'));

drop policy if exists documentos_write_ciclo_scope on ciclo.cliente_documentos;
drop policy if exists documentos_write_ciclo_scope_insert on ciclo.cliente_documentos;
drop policy if exists documentos_write_ciclo_scope_update on ciclo.cliente_documentos;
drop policy if exists documentos_write_ciclo_scope_delete on ciclo.cliente_documentos;
create policy documentos_write_ciclo_scope_insert on ciclo.cliente_documentos
  for insert to authenticated
  with check (
    security.usuario_tem_permissao('ciclo.documentos.write')
    and security.usuario_tem_carteira(carteira_id)
  );
create policy documentos_write_ciclo_scope_update on ciclo.cliente_documentos
  for update to authenticated
  using (
    security.usuario_tem_permissao('ciclo.documentos.write')
    and security.usuario_tem_carteira(carteira_id)
  )
  with check (
    security.usuario_tem_permissao('ciclo.documentos.write')
    and security.usuario_tem_carteira(carteira_id)
  );
create policy documentos_write_ciclo_scope_delete on ciclo.cliente_documentos
  for delete to authenticated
  using (
    security.usuario_tem_permissao('ciclo.documentos.write')
    and security.usuario_tem_carteira(carteira_id)
  );

drop policy if exists clientes_write_ciclo_scope on ciclo.clientes;
drop policy if exists clientes_write_ciclo_scope_insert on ciclo.clientes;
drop policy if exists clientes_write_ciclo_scope_update on ciclo.clientes;
drop policy if exists clientes_write_ciclo_scope_delete on ciclo.clientes;
create policy clientes_write_ciclo_scope_insert on ciclo.clientes
  for insert to authenticated
  with check (
    security.usuario_tem_permissao('ciclo.clientes.write')
    and security.usuario_tem_carteira(carteira_id)
  );
create policy clientes_write_ciclo_scope_update on ciclo.clientes
  for update to authenticated
  using (
    security.usuario_tem_permissao('ciclo.clientes.write')
    and security.usuario_tem_carteira(carteira_id)
  )
  with check (
    security.usuario_tem_permissao('ciclo.clientes.write')
    and security.usuario_tem_carteira(carteira_id)
  );
create policy clientes_write_ciclo_scope_delete on ciclo.clientes
  for delete to authenticated
  using (
    security.usuario_tem_permissao('ciclo.clientes.write')
    and security.usuario_tem_carteira(carteira_id)
  );

drop policy if exists contratos_write_ciclo_scope on ciclo.contratos;
drop policy if exists contratos_write_ciclo_scope_insert on ciclo.contratos;
drop policy if exists contratos_write_ciclo_scope_update on ciclo.contratos;
drop policy if exists contratos_write_ciclo_scope_delete on ciclo.contratos;
create policy contratos_write_ciclo_scope_insert on ciclo.contratos
  for insert to authenticated
  with check (
    security.usuario_tem_permissao('ciclo.clientes.write')
    and security.usuario_tem_carteira(carteira_id)
  );
create policy contratos_write_ciclo_scope_update on ciclo.contratos
  for update to authenticated
  using (
    security.usuario_tem_permissao('ciclo.clientes.write')
    and security.usuario_tem_carteira(carteira_id)
  )
  with check (
    security.usuario_tem_permissao('ciclo.clientes.write')
    and security.usuario_tem_carteira(carteira_id)
  );
create policy contratos_write_ciclo_scope_delete on ciclo.contratos
  for delete to authenticated
  using (
    security.usuario_tem_permissao('ciclo.clientes.write')
    and security.usuario_tem_carteira(carteira_id)
  );

drop policy if exists ocorrencias_write_ciclo_scope on ciclo.ocorrencias;
drop policy if exists ocorrencias_write_ciclo_scope_insert on ciclo.ocorrencias;
drop policy if exists ocorrencias_write_ciclo_scope_update on ciclo.ocorrencias;
drop policy if exists ocorrencias_write_ciclo_scope_delete on ciclo.ocorrencias;
create policy ocorrencias_write_ciclo_scope_insert on ciclo.ocorrencias
  for insert to authenticated
  with check (
    security.usuario_tem_permissao('ciclo.alertas.write')
    and security.usuario_tem_carteira(carteira_id)
  );
create policy ocorrencias_write_ciclo_scope_update on ciclo.ocorrencias
  for update to authenticated
  using (
    security.usuario_tem_permissao('ciclo.alertas.write')
    and security.usuario_tem_carteira(carteira_id)
  )
  with check (
    security.usuario_tem_permissao('ciclo.alertas.write')
    and security.usuario_tem_carteira(carteira_id)
  );
create policy ocorrencias_write_ciclo_scope_delete on ciclo.ocorrencias
  for delete to authenticated
  using (
    security.usuario_tem_permissao('ciclo.alertas.write')
    and security.usuario_tem_carteira(carteira_id)
  );

drop policy if exists regularidade_write_ciclo_scope on ciclo.regularidade_cliente;
drop policy if exists regularidade_write_ciclo_scope_insert on ciclo.regularidade_cliente;
drop policy if exists regularidade_write_ciclo_scope_update on ciclo.regularidade_cliente;
drop policy if exists regularidade_write_ciclo_scope_delete on ciclo.regularidade_cliente;
create policy regularidade_write_ciclo_scope_insert on ciclo.regularidade_cliente
  for insert to authenticated
  with check (
    security.usuario_tem_permissao('ciclo.clientes.write')
    and security.usuario_tem_carteira(carteira_id)
  );
create policy regularidade_write_ciclo_scope_update on ciclo.regularidade_cliente
  for update to authenticated
  using (
    security.usuario_tem_permissao('ciclo.clientes.write')
    and security.usuario_tem_carteira(carteira_id)
  )
  with check (
    security.usuario_tem_permissao('ciclo.clientes.write')
    and security.usuario_tem_carteira(carteira_id)
  );
create policy regularidade_write_ciclo_scope_delete on ciclo.regularidade_cliente
  for delete to authenticated
  using (
    security.usuario_tem_permissao('ciclo.clientes.write')
    and security.usuario_tem_carteira(carteira_id)
  );

drop policy if exists timeline_write_ciclo_scope on ciclo.timeline_cliente;
drop policy if exists timeline_write_ciclo_scope_insert on ciclo.timeline_cliente;
drop policy if exists timeline_write_ciclo_scope_update on ciclo.timeline_cliente;
drop policy if exists timeline_write_ciclo_scope_delete on ciclo.timeline_cliente;
create policy timeline_write_ciclo_scope_insert on ciclo.timeline_cliente
  for insert to authenticated
  with check (
    security.usuario_tem_app('ciclo')
    and security.usuario_tem_carteira(carteira_id)
  );
create policy timeline_write_ciclo_scope_update on ciclo.timeline_cliente
  for update to authenticated
  using (
    security.usuario_tem_app('ciclo')
    and security.usuario_tem_carteira(carteira_id)
  )
  with check (
    security.usuario_tem_app('ciclo')
    and security.usuario_tem_carteira(carteira_id)
  );
create policy timeline_write_ciclo_scope_delete on ciclo.timeline_cliente
  for delete to authenticated
  using (
    security.usuario_tem_app('ciclo')
    and security.usuario_tem_carteira(carteira_id)
  );

drop policy if exists carteiras_admin_global_all on core.carteiras;
drop policy if exists carteiras_admin_global_insert on core.carteiras;
drop policy if exists carteiras_admin_global_update on core.carteiras;
drop policy if exists carteiras_admin_global_delete on core.carteiras;
create policy carteiras_admin_global_insert on core.carteiras
  for insert to authenticated
  with check ((select security.is_admin_global()));
create policy carteiras_admin_global_update on core.carteiras
  for update to authenticated
  using ((select security.is_admin_global()))
  with check ((select security.is_admin_global()));
create policy carteiras_admin_global_delete on core.carteiras
  for delete to authenticated
  using ((select security.is_admin_global()));

notify pgrst, 'reload schema';
