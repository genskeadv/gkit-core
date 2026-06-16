-- GKLI Flex - reparo isolado de app e permissoes.
-- Use se o bootstrap principal falhar no bloco security.permissoes.

begin;

insert into core.apps (codigo, nome, descricao, status, url_path, ordem)
values (
  'flex',
  'GKLI Flex',
  'Modulo financeiro-operacional interno da GKIT Suite.',
  'ativo',
  '/modulos/flex',
  40
)
on conflict (codigo) do update
set
  nome = excluded.nome,
  descricao = excluded.descricao,
  status = excluded.status,
  url_path = excluded.url_path,
  ordem = excluded.ordem;

with rows(codigo, nome, descricao, recurso, acao) as (
  values
    ('flex.dashboard.read', 'Flex - dashboard', 'Acessar cockpit do Flex.', 'flex.dashboard', 'read'),
    ('flex.importacoes.read', 'Flex - ler importacoes', 'Consultar importacoes.', 'flex.importacoes', 'read'),
    ('flex.importacoes.write', 'Flex - gravar importacoes', 'Criar importacoes.', 'flex.importacoes', 'write'),
    ('flex.financeiro.read', 'Flex - ler financeiro', 'Consultar financeiro.', 'flex.financeiro', 'read'),
    ('flex.financeiro.write', 'Flex - gravar financeiro', 'Alterar financeiro.', 'flex.financeiro', 'write'),
    ('flex.colaboradores.read', 'Flex - ler colaboradores', 'Consultar colaboradores.', 'flex.colaboradores', 'read'),
    ('flex.colaboradores.write', 'Flex - gravar colaboradores', 'Gerenciar colaboradores.', 'flex.colaboradores', 'write'),
    ('flex.comissoes.read', 'Flex - ler comissoes', 'Consultar comissoes.', 'flex.comissoes', 'read'),
    ('flex.comissoes.write', 'Flex - gravar comissoes', 'Gerenciar comissoes.', 'flex.comissoes', 'write'),
    ('flex.comissoes.approve', 'Flex - aprovar comissoes', 'Aprovar comissoes.', 'flex.comissoes', 'approve'),
    ('flex.pagamentos.read', 'Flex - ler pagamentos', 'Consultar pagamentos.', 'flex.pagamentos', 'read'),
    ('flex.pagamentos.write', 'Flex - gravar pagamentos', 'Gerenciar pagamentos.', 'flex.pagamentos', 'write'),
    ('flex.pagamentos.reconcile', 'Flex - conciliar pagamentos', 'Conciliar pagamentos.', 'flex.pagamentos', 'reconcile'),
    ('flex.fechamentos.read', 'Flex - ler fechamentos', 'Consultar fechamentos.', 'flex.fechamentos', 'read'),
    ('flex.fechamentos.write', 'Flex - gravar fechamentos', 'Recalcular fechamentos.', 'flex.fechamentos', 'write'),
    ('flex.fechamentos.close', 'Flex - fechar competencia', 'Fechar competencias.', 'flex.fechamentos', 'close'),
    ('flex.configuracoes.read', 'Flex - ler configuracoes', 'Consultar configuracoes.', 'flex.configuracoes', 'read'),
    ('flex.configuracoes.write', 'Flex - gravar configuracoes', 'Gerenciar configuracoes.', 'flex.configuracoes', 'write')
)
insert into security.permissoes (
  codigo,
  nome,
  descricao,
  app_id,
  recurso,
  acao,
  sistema,
  status
)
select
  rows.codigo,
  rows.nome,
  rows.descricao,
  apps.id,
  rows.recurso,
  rows.acao,
  true,
  'ativo'::core.status_registro
from rows
left join core.apps apps on apps.codigo = 'flex'
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
