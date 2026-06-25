begin;

update core.apps
set status = 'inativo'::core.status_registro
where codigo = 'din';

update security.usuario_app_acessos
set ativo = false
where app_id in (
  select id
  from core.apps
  where codigo = 'din'
);

update security.permissoes
set status = 'inativo'::core.status_registro
where codigo like 'din.%';

commit;
