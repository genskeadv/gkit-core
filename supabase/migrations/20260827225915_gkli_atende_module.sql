begin;

insert into core.apps (codigo, nome, descricao, status, url_path, ordem)
values (
  'gkli_atende',
  'GKLI Atende',
  'Fila diaria para colaboradores acompanharem e atualizarem atendimentos e tarefas.',
  'ativo',
  '/modulos/gkli-atende',
  46
)
on conflict (codigo) do update
set
  nome = excluded.nome,
  descricao = excluded.descricao,
  status = excluded.status,
  url_path = excluded.url_path,
  ordem = excluded.ordem,
  updated_at = now();

with rows(codigo, nome, descricao, recurso, acao, sistema, status) as (
  values
    (
      'gkli_atende.read',
      'GKLI Atende - ler fila',
      'Consultar a fila individual de atendimentos e tarefas.',
      'gkli_atende',
      'read',
      true,
      'ativo'
    ),
    (
      'gkli_atende.write',
      'GKLI Atende - atualizar fila',
      'Iniciar e concluir tarefas da fila individual.',
      'gkli_atende',
      'write',
      true,
      'ativo'
    )
)
insert into security.permissoes (codigo, nome, descricao, app_id, recurso, acao, sistema, status)
select rows.codigo, rows.nome, rows.descricao, apps.id, rows.recurso, rows.acao, rows.sistema, rows.status::core.status_registro
from rows
join core.apps apps on apps.codigo = 'gkli_atende'
on conflict (codigo) do update
set
  nome = excluded.nome,
  descricao = excluded.descricao,
  app_id = excluded.app_id,
  recurso = excluded.recurso,
  acao = excluded.acao,
  sistema = excluded.sistema,
  status = excluded.status,
  updated_at = now();

insert into security.perfil_permissoes (perfil_id, permissao_id)
select perfil.id, permissao.id
from security.perfis perfil
cross join security.permissoes permissao
where perfil.codigo = 'admin_global'
  and permissao.codigo in ('gkli_atende.read', 'gkli_atende.write')
on conflict (perfil_id, permissao_id) do nothing;

with copied_permissions(source_codigo, target_codigo) as (
  values
    ('gkit_ate.dashboard.read', 'gkli_atende.read'),
    ('gkit_ate.atendimentos.read', 'gkli_atende.read'),
    ('gkit_ate.tarefas.read', 'gkli_atende.read'),
    ('gkit_ate.tarefas.write', 'gkli_atende.write')
)
insert into security.perfil_permissoes (perfil_id, permissao_id)
select distinct origem.perfil_id, destino.id
from copied_permissions map
join security.permissoes permissao_origem on permissao_origem.codigo = map.source_codigo
join security.perfil_permissoes origem on origem.permissao_id = permissao_origem.id
join security.permissoes destino on destino.codigo = map.target_codigo
on conflict (perfil_id, permissao_id) do nothing;

insert into security.usuario_app_acessos (usuario_id, app_id, ativo)
select distinct access.usuario_id, atende.id, true
from security.usuario_app_acessos access
join core.apps ate on ate.id = access.app_id and ate.codigo = 'gkit_ate'
join core.apps atende on atende.codigo = 'gkli_atende'
where access.ativo = true
on conflict (usuario_id, app_id) do update
set ativo = excluded.ativo;

notify pgrst, 'reload config';
notify pgrst, 'reload schema';

commit;
