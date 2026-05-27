-- GKLI Core - P0.3 seeds, views e permissões REST
-- Banco único e limpo para core/crm/ciclo/intr. Execute depois do P0.1.

do $$ begin
  if to_regclass('core.apps') is null then
    raise exception 'Execute primeiro o arquivo sql/01_admin_core_p0_1.sql. A tabela core.apps ainda nao existe.';
  end if;
end $$;

insert into core.apps ("codigo", "nome", "descricao", "url_path", "ordem", "status")
values
  ('ciclo', 'GKLI Ciclo', 'Lifecycle, onboarding, documentos e cadastro mestre', '/modulos/ciclo', 10, 'ativo'),
  ('crm', 'GKLI CRM', 'Pipeline comercial, oportunidades e propostas', '/modulos/crm', 20, 'ativo'),
  ('intr', 'GKLI Intr', 'Receitas, comissões, colaboradores e integridade operacional', '/modulos/intr', 30, 'ativo'),
  ('colab', 'GKLI Colab', 'Portal individual de colaboradores, pagamentos, comissões e documentos', '/modulos/colab', 40, 'ativo')
on conflict ("codigo") do update set
  "nome" = excluded."nome",
  "descricao" = excluded."descricao",
  "url_path" = excluded."url_path",
  "ordem" = excluded."ordem",
  "status" = excluded."status";

insert into core.carteiras ("nome", "descricao", "logo_url", "cor_primaria", "status", "metadata")
values
  ('GKLI', 'Carteira operacional principal da GKLI', null, '#351B40', 'ativo', '{}'::jsonb)
on conflict ("nome_normalizado") do update set
  "nome" = excluded."nome",
  "descricao" = excluded."descricao",
  "logo_url" = excluded."logo_url",
  "cor_primaria" = excluded."cor_primaria",
  "status" = excluded."status",
  "metadata" = excluded."metadata";

insert into security.perfis ("codigo", "nome", "descricao", "nivel", "sistema", "status")
values
  ('admin_global', 'Administrador Global', 'Acesso total ao core e aos módulos integrados', 1, true, 'ativo'),
  ('admin_carteira', 'Administrador da Carteira', 'Administra usuários e dados de uma carteira', 10, true, 'ativo'),
  ('gestor', 'Gestor', 'Acompanha operação, indicadores e cadastros', 30, true, 'ativo'),
  ('operador', 'Operador', 'Executa rotinas operacionais', 50, true, 'ativo'),
  ('visualizador', 'Visualizador', 'Acesso somente leitura', 90, true, 'ativo')
on conflict ("codigo") do update set
  "nome" = excluded."nome",
  "descricao" = excluded."descricao",
  "nivel" = excluded."nivel",
  "sistema" = excluded."sistema",
  "status" = excluded."status";

with rows(codigo, nome, descricao, app_codigo, recurso, acao, sistema, status) as (
  values
    ('admin.apps.read', 'Ver módulos', 'Listar e consultar módulos integrados', null, 'admin.apps', 'read', true, 'ativo'),
    ('admin.apps.write', 'Gerenciar módulos', 'Editar módulos integrados e status', null, 'admin.apps', 'write', true, 'ativo'),
    ('admin.auditoria.read', 'Ver auditoria', 'Consultar eventos administrativos', null, 'admin.auditoria', 'read', true, 'ativo'),
    ('admin.carteiras.read', 'Ver carteiras', 'Listar e consultar carteiras', null, 'admin.carteiras', 'read', true, 'ativo'),
    ('admin.carteiras.write', 'Gerenciar carteiras', 'Criar e editar carteiras', null, 'admin.carteiras', 'write', true, 'ativo'),
    ('admin.dashboard.read', 'Ver Admin Core', 'Acessar visão geral administrativa', null, 'admin.dashboard', 'read', true, 'ativo'),
    ('admin.perfis.read', 'Ver perfis', 'Listar e consultar perfis', null, 'admin.perfis', 'read', true, 'ativo'),
    ('admin.perfis.write', 'Gerenciar perfis', 'Criar e editar perfis', null, 'admin.perfis', 'write', true, 'ativo'),
    ('admin.permissoes.read', 'Ver permissões', 'Listar permissões', null, 'admin.permissoes', 'read', true, 'ativo'),
    ('admin.usuarios.read', 'Ver usuários', 'Listar e consultar usuários', null, 'admin.usuarios', 'read', true, 'ativo'),
    ('admin.usuarios.write', 'Gerenciar usuários', 'Criar e editar usuários', null, 'admin.usuarios', 'write', true, 'ativo'),
    ('ciclo.alertas.read', 'Ver alertas Ciclo', 'Consultar alertas do cliente', 'ciclo', 'ciclo.alertas', 'read', true, 'ativo'),
    ('ciclo.alertas.write', 'Gerenciar alertas Ciclo', 'Criar e editar alertas', 'ciclo', 'ciclo.alertas', 'write', true, 'ativo'),
    ('ciclo.clientes.read', 'Ver clientes Ciclo', 'Consultar clientes no Ciclo', 'ciclo', 'ciclo.clientes', 'read', true, 'ativo'),
    ('ciclo.clientes.write', 'Gerenciar clientes Ciclo', 'Criar e editar clientes no Ciclo', 'ciclo', 'ciclo.clientes', 'write', true, 'ativo'),
    ('ciclo.dashboard.read', 'Ver dashboard Ciclo', 'Acessar dashboard do Ciclo', 'ciclo', 'ciclo.dashboard', 'read', true, 'ativo'),
    ('ciclo.documentos.read', 'Ver documentos', 'Consultar documentos do cliente', 'ciclo', 'ciclo.documentos', 'read', true, 'ativo'),
    ('ciclo.documentos.write', 'Gerenciar documentos', 'Criar e editar documentos do cliente', 'ciclo', 'ciclo.documentos', 'write', true, 'ativo'),
    ('crm.dashboard.read', 'Ver dashboard CRM', 'Acessar dashboard do CRM', 'crm', 'crm.dashboard', 'read', true, 'ativo'),
    ('crm.oportunidades.read', 'Ver oportunidades', 'Consultar oportunidades comerciais', 'crm', 'crm.oportunidades', 'read', true, 'ativo'),
    ('crm.oportunidades.write', 'Gerenciar oportunidades', 'Criar e editar oportunidades', 'crm', 'crm.oportunidades', 'write', true, 'ativo'),
    ('crm.propostas.read', 'Ver propostas', 'Consultar propostas', 'crm', 'crm.propostas', 'read', true, 'ativo'),
    ('crm.propostas.write', 'Gerenciar propostas', 'Criar e editar propostas', 'crm', 'crm.propostas', 'write', true, 'ativo'),
    ('intr.comissoes.read', 'Ver comissões', 'Consultar comissões do GKLI Intr', 'intr', 'intr.comissoes', 'read', true, 'ativo'),
    ('intr.comissoes.write', 'Gerenciar comissões', 'Criar e editar comissões do GKLI Intr', 'intr', 'intr.comissoes', 'write', true, 'ativo'),
    ('intr.dashboard.read', 'Ver dashboard Intr', 'Acessar dashboard do GKLI Intr', 'intr', 'intr.dashboard', 'read', true, 'ativo'),
    ('intr.integridade.read', 'Ver integridade', 'Consultar alertas de integridade do GKLI Intr', 'intr', 'intr.integridade', 'read', true, 'ativo'),
    ('intr.receitas.read', 'Ver receitas', 'Consultar receitas do GKLI Intr', 'intr', 'intr.receitas', 'read', true, 'ativo'),
    ('intr.receitas.write', 'Gerenciar receitas', 'Criar e editar receitas do GKLI Intr', 'intr', 'intr.receitas', 'write', true, 'ativo')
)
insert into security.permissoes (codigo, nome, descricao, app_id, recurso, acao, sistema, status)
select rows.codigo, rows.nome, rows.descricao, apps.id, rows.recurso, rows.acao, rows.sistema, rows.status::core.status_registro
from rows
left join core.apps apps on apps.codigo = rows.app_codigo
on conflict (codigo) do update set
  nome = excluded.nome,
  descricao = excluded.descricao,
  app_id = excluded.app_id,
  recurso = excluded.recurso,
  acao = excluded.acao,
  sistema = excluded.sistema,
  status = excluded.status;

with rows(perfil_codigo, permissao_codigo) as (
  values
    ('admin_global', 'admin.apps.read'),
    ('admin_global', 'admin.apps.write'),
    ('admin_global', 'admin.auditoria.read'),
    ('admin_global', 'admin.carteiras.read'),
    ('admin_global', 'admin.carteiras.write'),
    ('admin_global', 'admin.dashboard.read'),
    ('admin_global', 'admin.perfis.read'),
    ('admin_global', 'admin.perfis.write'),
    ('admin_global', 'admin.permissoes.read'),
    ('admin_global', 'admin.usuarios.read'),
    ('admin_global', 'admin.usuarios.write'),
    ('admin_global', 'ciclo.alertas.read'),
    ('admin_global', 'ciclo.alertas.write'),
    ('admin_global', 'ciclo.clientes.read'),
    ('admin_global', 'ciclo.clientes.write'),
    ('admin_global', 'ciclo.dashboard.read'),
    ('admin_global', 'ciclo.documentos.read'),
    ('admin_global', 'ciclo.documentos.write'),
    ('admin_global', 'crm.dashboard.read'),
    ('admin_global', 'crm.oportunidades.read'),
    ('admin_global', 'crm.oportunidades.write'),
    ('admin_global', 'crm.propostas.read'),
    ('admin_global', 'crm.propostas.write'),
    ('admin_global', 'intr.comissoes.read'),
    ('admin_global', 'intr.comissoes.write'),
    ('admin_global', 'intr.dashboard.read'),
    ('admin_global', 'intr.integridade.read'),
    ('admin_global', 'intr.receitas.read'),
    ('admin_global', 'intr.receitas.write'),
    ('admin_carteira', 'admin.apps.read'),
    ('admin_carteira', 'admin.carteiras.read'),
    ('admin_carteira', 'admin.dashboard.read'),
    ('admin_carteira', 'admin.perfis.read'),
    ('admin_carteira', 'admin.permissoes.read'),
    ('admin_carteira', 'admin.usuarios.read'),
    ('admin_carteira', 'ciclo.alertas.read'),
    ('admin_carteira', 'ciclo.alertas.write'),
    ('admin_carteira', 'ciclo.clientes.read'),
    ('admin_carteira', 'ciclo.clientes.write'),
    ('admin_carteira', 'ciclo.dashboard.read'),
    ('admin_carteira', 'ciclo.documentos.read'),
    ('admin_carteira', 'ciclo.documentos.write'),
    ('admin_carteira', 'crm.dashboard.read'),
    ('admin_carteira', 'crm.oportunidades.read'),
    ('admin_carteira', 'crm.oportunidades.write'),
    ('admin_carteira', 'crm.propostas.read'),
    ('admin_carteira', 'crm.propostas.write'),
    ('admin_carteira', 'intr.comissoes.read'),
    ('admin_carteira', 'intr.comissoes.write'),
    ('admin_carteira', 'intr.dashboard.read'),
    ('admin_carteira', 'intr.integridade.read'),
    ('admin_carteira', 'intr.receitas.read'),
    ('admin_carteira', 'intr.receitas.write'),
    ('gestor', 'ciclo.alertas.read'),
    ('gestor', 'ciclo.clientes.read'),
    ('gestor', 'ciclo.dashboard.read'),
    ('gestor', 'ciclo.documentos.read'),
    ('gestor', 'crm.dashboard.read'),
    ('gestor', 'crm.oportunidades.read'),
    ('gestor', 'crm.propostas.read'),
    ('gestor', 'intr.comissoes.read'),
    ('gestor', 'intr.dashboard.read'),
    ('gestor', 'intr.integridade.read'),
    ('gestor', 'intr.receitas.read'),
    ('operador', 'ciclo.alertas.read'),
    ('operador', 'ciclo.clientes.read'),
    ('operador', 'ciclo.documentos.read'),
    ('operador', 'ciclo.documentos.write'),
    ('operador', 'crm.oportunidades.read'),
    ('operador', 'crm.oportunidades.write'),
    ('operador', 'crm.propostas.read'),
    ('operador', 'intr.comissoes.read'),
    ('operador', 'intr.comissoes.write'),
    ('operador', 'intr.receitas.read'),
    ('operador', 'intr.receitas.write'),
    ('visualizador', 'ciclo.alertas.read'),
    ('visualizador', 'ciclo.clientes.read'),
    ('visualizador', 'ciclo.dashboard.read'),
    ('visualizador', 'ciclo.documentos.read'),
    ('visualizador', 'crm.dashboard.read'),
    ('visualizador', 'crm.oportunidades.read'),
    ('visualizador', 'crm.propostas.read'),
    ('visualizador', 'intr.comissoes.read'),
    ('visualizador', 'intr.dashboard.read'),
    ('visualizador', 'intr.integridade.read'),
    ('visualizador', 'intr.receitas.read')
)
insert into security.perfil_permissoes (perfil_id, permissao_id)
select perfis.id, permissoes.id
from rows
join security.perfis on perfis.codigo = rows.perfil_codigo
join security.permissoes on permissoes.codigo = rows.permissao_codigo
on conflict (perfil_id, permissao_id) do nothing;

create or replace view audit."v_eventos_admin" as
 SELECT e.id,
    e.created_at,
    e.acao,
    e.descricao,
    e.app_codigo,
    e.entidade_schema,
    e.entidade_tabela,
    e.entidade_id,
    e.metadata,
    u.id AS usuario_id,
    u.nome AS usuario_nome,
    u.email AS usuario_email,
    c.id AS carteira_id,
    c.nome AS carteira_nome
   FROM ((audit.eventos e
     LEFT JOIN security.usuarios u ON ((u.id = e.usuario_id)))
     LEFT JOIN core.carteiras c ON ((c.id = e.carteira_id)));

create or replace view security."v_apps_admin" as
 SELECT a.id,
    a.codigo,
    a.nome,
    a.descricao,
    a.url_path,
    a.ordem,
    a.status,
    a.created_at,
    a.updated_at,
    count(DISTINCT uaa.usuario_id) FILTER (WHERE (uaa.ativo = true)) AS total_usuarios_ativos,
    count(DISTINCT p.id) AS total_permissoes
   FROM ((core.apps a
     LEFT JOIN security.usuario_app_acessos uaa ON ((uaa.app_id = a.id)))
     LEFT JOIN security.permissoes p ON ((p.app_id = a.id)))
  GROUP BY a.id;

create or replace view security."v_carteiras_admin" as
 SELECT c.id,
    c.nome,
    c.nome_normalizado,
    c.descricao,
    c.logo_url,
    c.cor_primaria,
    c.status,
    c.created_at,
    c.updated_at,
    count(DISTINCT uc.usuario_id) FILTER (WHERE (uc.ativo = true)) AS total_usuarios_ativos
   FROM (core.carteiras c
     LEFT JOIN security.usuario_carteiras uc ON ((uc.carteira_id = c.id)))
  GROUP BY c.id;

create or replace view security."v_perfis_admin" as
 SELECT pf.id,
    pf.codigo,
    pf.nome,
    pf.descricao,
    pf.nivel,
    pf.sistema,
    pf.status,
    pf.app_id,
    a.codigo AS app_codigo,
    a.nome AS app_nome,
    pf.created_at,
    pf.updated_at,
    count(pp.permissao_id) AS total_permissoes
   FROM ((security.perfis pf
     LEFT JOIN core.apps a ON ((a.id = pf.app_id)))
     LEFT JOIN security.perfil_permissoes pp ON ((pp.perfil_id = pf.id)))
  GROUP BY pf.id, a.codigo, a.nome;

create or replace view security."v_permissoes_admin" as
 SELECT p.id,
    p.codigo,
    p.nome,
    p.descricao,
    p.recurso,
    p.acao,
    p.sistema,
    p.status,
    p.app_id,
    a.codigo AS app_codigo,
    a.nome AS app_nome,
    p.created_at,
    p.updated_at,
    count(pp.perfil_id) AS total_perfis
   FROM ((security.permissoes p
     LEFT JOIN core.apps a ON ((a.id = p.app_id)))
     LEFT JOIN security.perfil_permissoes pp ON ((pp.permissao_id = p.id)))
  GROUP BY p.id, a.codigo, a.nome;

create or replace view security."v_usuarios_admin" as
 SELECT u.id,
    u.nome,
    u.email,
    u.tipo,
    u.status,
    u.avatar_url,
    u.ultimo_login_em,
    u.created_at,
    u.updated_at,
    COALESCE(jsonb_agg(DISTINCT jsonb_build_object('carteira_id', c.id, 'carteira_nome', c.nome, 'principal', uc.principal, 'ativo', uc.ativo)) FILTER (WHERE (c.id IS NOT NULL)), '[]'::jsonb) AS carteiras,
    COALESCE(jsonb_agg(DISTINCT jsonb_build_object('app_id', a.id, 'app_codigo', a.codigo, 'app_nome', a.nome, 'ativo', uaa.ativo)) FILTER (WHERE (a.id IS NOT NULL)), '[]'::jsonb) AS apps
   FROM ((((security.usuarios u
     LEFT JOIN security.usuario_carteiras uc ON ((uc.usuario_id = u.id)))
     LEFT JOIN core.carteiras c ON ((c.id = uc.carteira_id)))
     LEFT JOIN security.usuario_app_acessos uaa ON ((uaa.usuario_id = u.id)))
     LEFT JOIN core.apps a ON ((a.id = uaa.app_id)))
  GROUP BY u.id;

grant usage on schema core to authenticated, service_role;
grant usage on schema security to authenticated, service_role;
grant usage on schema audit to service_role;

grant select, insert, update, delete on all tables in schema core to service_role;
grant select, insert, update, delete on all tables in schema security to service_role;
grant select, insert, update, delete on all tables in schema audit to service_role;

grant select on core.apps to authenticated;
grant select on core.carteiras to authenticated;
grant select on security.usuarios to authenticated;
grant select on security.usuario_app_acessos to authenticated;
grant select on security.usuario_carteiras to authenticated;
grant select on security.usuario_perfis to authenticated;
grant select on security.perfis to authenticated;
grant select on security.permissoes to authenticated;
grant select on security.perfil_permissoes to authenticated;

grant usage, select on all sequences in schema core to service_role;
grant usage, select on all sequences in schema security to service_role;
grant usage, select on all sequences in schema audit to service_role;
