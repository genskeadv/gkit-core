begin;

insert into core.apps (codigo, nome, descricao, status, url_path, ordem)
values (
  'gkit_jur',
  'GKIT Jur',
  'Operacao juridica integrada: processos, prazos, agenda e documentos.',
  'ativo',
  '/modulos/gkit-jur',
  46
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
      'gkit_jur.dashboard.read',
      'GKIT Jur - cockpit',
      'Acessar o cockpit juridico.',
      'gkit_jur.dashboard',
      'read',
      true,
      'ativo'
    ),
    (
      'gkit_jur.operacao.write',
      'GKIT Jur - operacao',
      'Criar e atualizar registros juridicos.',
      'gkit_jur.operacao',
      'write',
      true,
      'ativo'
    )
)
insert into security.permissoes (codigo, nome, descricao, app_id, recurso, acao, sistema, status)
select rows.codigo, rows.nome, rows.descricao, apps.id, rows.recurso, rows.acao, rows.sistema, rows.status::core.status_registro
from rows
left join core.apps apps on apps.codigo = 'gkit_jur'
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
