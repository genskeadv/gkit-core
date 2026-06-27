begin;

with target_apps as (
  select id
  from core.apps
  where codigo in ('crm', 'din', 'flex', 'fix', 'intr')
)
update security.usuario_app_acessos access
set
  ativo = false,
  updated_at = now()
from target_apps
where access.app_id = target_apps.id
  and access.ativo = true;

update core.apps
set
  status = 'inativo'::core.status_registro,
  updated_at = now()
where codigo in ('crm', 'din', 'flex', 'fix', 'intr');

update security.permissoes
set
  status = 'inativo'::core.status_registro,
  updated_at = now()
where codigo like 'crm.%'
   or codigo like 'din.%'
   or codigo like 'flex.%'
   or codigo like 'fix.%'
   or codigo like 'intr.%';

commit;
