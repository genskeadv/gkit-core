-- GKLI Core - grants minimos para apps autenticados
-- Permite que apps operacionais confirmem usuario, app e escopo no Core.
-- A visibilidade efetiva segue limitada pelas policies RLS ja definidas.

grant usage on schema core to authenticated, service_role;
grant usage on schema security to authenticated, service_role;

grant select on core.apps to authenticated;
grant select on core.carteiras to authenticated;

grant select on security.usuarios to authenticated;
grant select on security.usuario_app_acessos to authenticated;
grant select on security.usuario_carteiras to authenticated;
grant select on security.usuario_perfis to authenticated;
grant select on security.perfis to authenticated;
grant select on security.permissoes to authenticated;
grant select on security.perfil_permissoes to authenticated;

notify pgrst, 'reload schema';
