begin;

insert into core.apps (codigo, nome, descricao, status, url_path, ordem)
values (
  'din',
  'GKIT DIN',
  'Faturamento mensal: repasses, clientes do ciclo e exportacao Omie.',
  'ativo',
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

with legacy_access as (
  select distinct access.usuario_id
  from security.usuario_app_acessos access
  join core.apps legacy_apps on legacy_apps.id = access.app_id
  where access.ativo = true
    and legacy_apps.codigo in ('intr', 'fix', 'flex')
),
din_app as (
  select id
  from core.apps
  where codigo = 'din'
)
insert into security.usuario_app_acessos (usuario_id, app_id, ativo)
select legacy_access.usuario_id, din_app.id, true
from legacy_access
cross join din_app
on conflict (usuario_id, app_id) do update
set
  ativo = true,
  updated_at = now();

update core.apps
set
  status = 'inativo',
  url_path = '/modulos/din',
  updated_at = now()
where codigo in ('intr', 'fix', 'flex');

commit;
