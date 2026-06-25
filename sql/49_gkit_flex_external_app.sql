begin;

insert into core.apps (codigo, nome, descricao, status, url_path, ordem)
values (
  'gkit_flex',
  'GKIT Flex',
  'App financeiro independente para comissoes, contas a pagar, cadastros e auditoria mensal.',
  'ativo',
  '/modulos/gkit-flex',
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
    ('gkit_flex.dashboard.read', 'GKIT Flex - acessar app', 'Acessar o app independente GKIT Flex pelo painel.', 'gkit_flex.dashboard', 'read', true, 'ativo'),
    ('gkit_flex.comissoes.read', 'GKIT Flex - ler comissoes', 'Consultar calculos e execucoes de comissoes.', 'gkit_flex.comissoes', 'read', true, 'ativo'),
    ('gkit_flex.comissoes.write', 'GKIT Flex - processar comissoes', 'Processar arquivos e confirmar calculos de comissoes.', 'gkit_flex.comissoes', 'write', true, 'ativo'),
    ('gkit_flex.contas_pagar.read', 'GKIT Flex - ler contas a pagar', 'Consultar competencias e itens de contas a pagar.', 'gkit_flex.contas_pagar', 'read', true, 'ativo'),
    ('gkit_flex.contas_pagar.write', 'GKIT Flex - gravar contas a pagar', 'Importar, editar e fechar contas a pagar.', 'gkit_flex.contas_pagar', 'write', true, 'ativo'),
    ('gkit_flex.cadastros.read', 'GKIT Flex - ler cadastros', 'Consultar categorias, centros, carteiras e aliases.', 'gkit_flex.cadastros', 'read', true, 'ativo'),
    ('gkit_flex.cadastros.write', 'GKIT Flex - gravar cadastros', 'Normalizar cadastros e confirmar reclassificacoes.', 'gkit_flex.cadastros', 'write', true, 'ativo'),
    ('gkit_flex.auditoria.read', 'GKIT Flex - auditoria', 'Consultar auditoria mensal e exportacoes.', 'gkit_flex.auditoria', 'read', true, 'ativo')
)
insert into security.permissoes (codigo, nome, descricao, app_id, recurso, acao, sistema, status)
select rows.codigo, rows.nome, rows.descricao, apps.id, rows.recurso, rows.acao, rows.sistema, rows.status::core.status_registro
from rows
left join core.apps apps on apps.codigo = 'gkit_flex'
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
