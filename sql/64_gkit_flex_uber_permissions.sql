-- Permissoes administrativas para conciliacao de Uber no GKIT FAT.

insert into security.permissoes (codigo, nome, descricao, app_id, recurso, acao, sistema, status)
select *
from (
  values
    (
      'gkit_flex.uber.read',
      'GKIT Flex - ler Uber (legado)',
      'Consultar relatorios, lancamentos e pendencias de Uber.',
      'gkit_flex',
      'gkit_flex.uber',
      'read',
      true,
      'ativo'
    ),
    (
      'gkit_flex.uber.write',
      'GKIT Flex - gravar Uber (legado)',
      'Importar relatorios e atualizar status de reembolso Uber.',
      'gkit_flex',
      'gkit_flex.uber',
      'write',
      true,
      'ativo'
    ),
    (
      'gkit_fat.uber.read',
      'GKIT FAT - ler Uber',
      'Consultar relatorios, lancamentos e pendencias de Uber.',
      'gkit_fat',
      'gkit_fat.uber',
      'read',
      true,
      'ativo'
    ),
    (
      'gkit_fat.uber.write',
      'GKIT FAT - gravar Uber',
      'Importar relatorios e atualizar status de reembolso Uber.',
      'gkit_fat',
      'gkit_fat.uber',
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
  and permissao.codigo in ('gkit_fat.uber.read', 'gkit_fat.uber.write', 'gkit_flex.uber.read', 'gkit_flex.uber.write')
on conflict (perfil_id, permissao_id) do nothing;
