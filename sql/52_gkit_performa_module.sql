begin;

insert into core.apps (codigo, nome, descricao, status, url_path, ordem)
values (
  'gkit_performa',
  'GKIT Performa',
  'Ranking de performance do time a partir da agenda operacional.',
  'ativo',
  '/modulos/gkit-performa',
  45
)
on conflict (codigo) do update
set
  nome = excluded.nome,
  descricao = excluded.descricao,
  status = excluded.status,
  url_path = excluded.url_path,
  ordem = excluded.ordem;

with rows(codigo, nome, descricao, recurso, acao, sistema, status) as (
  values
    (
      'gkit_performa.dashboard.read',
      'GKIT Performa - dashboard',
      'Acessar ranking de performance da agenda.',
      'gkit_performa.dashboard',
      'read',
      true,
      'ativo'
    )
)
insert into security.permissoes (codigo, nome, descricao, app_id, recurso, acao, sistema, status)
select rows.codigo, rows.nome, rows.descricao, apps.id, rows.recurso, rows.acao, rows.sistema, rows.status::core.status_registro
from rows
left join core.apps apps on apps.codigo = 'gkit_performa'
on conflict (codigo) do update
set
  nome = excluded.nome,
  descricao = excluded.descricao,
  app_id = excluded.app_id,
  recurso = excluded.recurso,
  acao = excluded.acao,
  sistema = excluded.sistema,
  status = excluded.status;

commit;
