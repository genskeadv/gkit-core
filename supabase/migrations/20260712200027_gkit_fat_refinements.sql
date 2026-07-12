begin;

with grants(perfil_codigo, permissao_codigo) as (
  values
    ('admin_global', 'gkit_fat.dashboard.read'),
    ('admin_global', 'gkit_fat.contratos.read'),
    ('admin_global', 'gkit_fat.contratos.write'),
    ('admin_global', 'gkit_fat.faturas.read'),
    ('admin_global', 'gkit_fat.faturas.write'),
    ('admin_global', 'gkit_fat.configuracoes.read'),
    ('admin_global', 'gkit_fat.configuracoes.write'),
    ('gestor', 'gkit_fat.dashboard.read'),
    ('gestor', 'gkit_fat.contratos.read'),
    ('gestor', 'gkit_fat.contratos.write'),
    ('gestor', 'gkit_fat.faturas.read'),
    ('gestor', 'gkit_fat.faturas.write'),
    ('gestor', 'gkit_fat.configuracoes.read'),
    ('operador', 'gkit_fat.dashboard.read'),
    ('operador', 'gkit_fat.contratos.read'),
    ('operador', 'gkit_fat.contratos.write'),
    ('operador', 'gkit_fat.faturas.read'),
    ('operador', 'gkit_fat.faturas.write'),
    ('visualizador', 'gkit_fat.dashboard.read'),
    ('visualizador', 'gkit_fat.contratos.read'),
    ('visualizador', 'gkit_fat.faturas.read'),
    ('visualizador', 'gkit_fat.configuracoes.read')
)
insert into security.perfil_permissoes (perfil_id, permissao_id)
select perfis.id, permissoes.id
from grants
join security.perfis perfis
  on perfis.codigo = grants.perfil_codigo
  and perfis.status = 'ativo'
join security.permissoes permissoes
  on permissoes.codigo = grants.permissao_codigo
  and permissoes.status = 'ativo'
on conflict (perfil_id, permissao_id) do nothing;

commit;
