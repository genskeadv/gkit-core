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
  ordem = excluded.ordem;

with rows(codigo, nome, descricao, recurso, acao, sistema, status) as (
  values
    ('din.dashboard.read', 'DIN - dashboard', 'Acessar o modulo DIN no Core.', 'din.dashboard', 'read', true, 'ativo'),
    ('din.processamento.read', 'DIN - ler processamento', 'Consultar pre-processamentos de faturamento mensal.', 'din.processamento', 'read', true, 'ativo'),
    ('din.processamento.write', 'DIN - processar faturamento', 'Processar arquivos mensais do DIN.', 'din.processamento', 'write', true, 'ativo'),
    ('din.exportacao.write', 'DIN - exportar Omie', 'Gerar planilha de importacao Omie e conferencia do DIN.', 'din.exportacao', 'write', true, 'ativo')
)
insert into security.permissoes (codigo, nome, descricao, app_id, recurso, acao, sistema, status)
select rows.codigo, rows.nome, rows.descricao, apps.id, rows.recurso, rows.acao, rows.sistema, rows.status::core.status_registro
from rows
left join core.apps apps on apps.codigo = 'din'
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
