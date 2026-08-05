-- Permissoes administrativas para conciliacao de Uber no GKIT Flex.

insert into security.permissoes (codigo, nome, descricao, app_id, recurso, acao, sistema, status)
select *
from (
  values
    (
      'gkit_flex.uber.read',
      'GKIT Flex - ler Uber',
      'Consultar relatorios, lancamentos e pendencias de Uber.',
      'gkit_flex',
      'gkit_flex.uber',
      'read',
      true,
      'ativo'
    ),
    (
      'gkit_flex.uber.write',
      'GKIT Flex - gravar Uber',
      'Importar relatorios e atualizar status de reembolso Uber.',
      'gkit_flex',
      'gkit_flex.uber',
      'write',
      true,
      'ativo'
    )
) as seed(codigo, nome, descricao, app_codigo, recurso, acao, sistema, status)
join core.apps app on app.codigo = seed.app_codigo
on conflict (codigo) do update set
  nome = excluded.nome,
  descricao = excluded.descricao,
  app_id = excluded.app_id,
  recurso = excluded.recurso,
  acao = excluded.acao,
  sistema = excluded.sistema,
  status = excluded.status;

insert into security.perfil_permissoes (perfil_id, permissao_id)
select perfil.id, permissao.id
from security.perfis perfil
cross join security.permissoes permissao
where perfil.codigo in ('admin_global')
  and permissao.codigo in ('gkit_flex.uber.read', 'gkit_flex.uber.write')
on conflict (perfil_id, permissao_id) do nothing;
