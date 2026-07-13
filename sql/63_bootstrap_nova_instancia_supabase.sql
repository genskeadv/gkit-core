-- GKIT Core - bootstrap de nova instancia Supabase
-- Uso previsto:
-- 1. Criar um projeto Supabase vazio para a nova operacao.
-- 2. Executar este script primeiro, via SQL Editor ou CLI.
-- 3. Rodar as migrations do repositorio em supabase/migrations.
-- 4. Rodar os scripts SQL de modulos que nao estejam em migrations, quando aplicavel.
-- 5. Criar usuario(s) no Supabase Auth e vincular em security.usuarios.

begin;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists unaccent with schema extensions;

create schema if not exists core;
create schema if not exists security;
create schema if not exists audit;

-- ---------------------------------------------------------------------------
-- Core
-- ---------------------------------------------------------------------------

create table if not exists core.usuario_tipos (
  id uuid primary key default extensions.gen_random_uuid(),
  codigo text not null unique,
  nome text not null,
  descricao text,
  ativo boolean not null default true,
  sistema boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists core.apps (
  id uuid primary key default extensions.gen_random_uuid(),
  codigo text not null unique,
  nome text not null,
  descricao text,
  status text not null default 'ativo',
  url_path text,
  ordem integer not null default 100,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists core.carteiras (
  id uuid primary key default extensions.gen_random_uuid(),
  nome text not null,
  descricao text,
  logo_url text,
  cor_primaria text,
  status text not null default 'ativo',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists carteiras_nome_uidx
  on core.carteiras (lower(nome));

create table if not exists core.times (
  id uuid primary key default extensions.gen_random_uuid(),
  nome text not null,
  descricao text,
  area text,
  status text not null default 'ativo',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists times_nome_uidx
  on core.times (lower(nome));

-- ---------------------------------------------------------------------------
-- Security
-- ---------------------------------------------------------------------------

create table if not exists security.usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text not null unique,
  tipo text not null default 'operador',
  tipo_id uuid references core.usuario_tipos(id) on delete set null,
  status text not null default 'pendente',
  avatar_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists security.usuario_carteiras (
  id uuid primary key default extensions.gen_random_uuid(),
  usuario_id uuid not null references security.usuarios(id) on delete cascade,
  carteira_id uuid not null references core.carteiras(id) on delete cascade,
  principal boolean not null default false,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (usuario_id, carteira_id)
);

create table if not exists security.usuario_app_acessos (
  id uuid primary key default extensions.gen_random_uuid(),
  usuario_id uuid not null references security.usuarios(id) on delete cascade,
  app_id uuid not null references core.apps(id) on delete cascade,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (usuario_id, app_id)
);

create table if not exists security.perfis (
  id uuid primary key default extensions.gen_random_uuid(),
  codigo text not null unique,
  nome text not null,
  descricao text,
  nivel integer not null default 50,
  app_id uuid references core.apps(id) on delete set null,
  status text not null default 'ativo',
  sistema boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists security.usuario_perfis (
  id uuid primary key default extensions.gen_random_uuid(),
  usuario_id uuid not null references security.usuarios(id) on delete cascade,
  perfil_id uuid not null references security.perfis(id) on delete cascade,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (usuario_id, perfil_id)
);

create table if not exists security.permissoes (
  id uuid primary key default extensions.gen_random_uuid(),
  codigo text not null unique,
  nome text not null,
  descricao text,
  app_id uuid references core.apps(id) on delete set null,
  recurso text,
  acao text,
  sistema boolean not null default false,
  status text not null default 'ativo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists security.perfil_permissoes (
  id uuid primary key default extensions.gen_random_uuid(),
  perfil_id uuid not null references security.perfis(id) on delete cascade,
  permissao_id uuid not null references security.permissoes(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (perfil_id, permissao_id)
);

create table if not exists core.carteira_colaboradores (
  id uuid primary key default extensions.gen_random_uuid(),
  carteira_id uuid not null references core.carteiras(id) on delete cascade,
  usuario_id uuid not null references security.usuarios(id) on delete cascade,
  principal boolean not null default false,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (carteira_id, usuario_id)
);

create table if not exists core.time_colaboradores (
  id uuid primary key default extensions.gen_random_uuid(),
  time_id uuid not null references core.times(id) on delete cascade,
  usuario_id uuid not null references security.usuarios(id) on delete cascade,
  principal boolean not null default false,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (time_id, usuario_id)
);

-- ---------------------------------------------------------------------------
-- Audit
-- ---------------------------------------------------------------------------

create table if not exists audit.eventos (
  id uuid primary key default extensions.gen_random_uuid(),
  usuario_id uuid references security.usuarios(id) on delete set null,
  acao text not null,
  descricao text,
  metadata jsonb not null default '{}'::jsonb,
  app_codigo text,
  carteira_id uuid references core.carteiras(id) on delete set null,
  entidade_schema text,
  entidade_tabela text,
  entidade_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists audit_eventos_created_at_idx
  on audit.eventos (created_at desc);

-- ---------------------------------------------------------------------------
-- Funcoes de autorizacao
-- ---------------------------------------------------------------------------

create or replace function security.is_admin_global()
returns boolean
language sql
stable
security invoker
set search_path = security, core, public
as $$
  select exists (
    select 1
    from security.usuarios u
    where u.id = auth.uid()
      and u.status = 'ativo'
      and u.tipo = 'admin_global'
  );
$$;

create or replace function security.usuario_tem_permissao(permissao_codigo text)
returns boolean
language sql
stable
security invoker
set search_path = security, core, public
as $$
  select exists (
    select 1
    from security.usuarios u
    where u.id = auth.uid()
      and u.status = 'ativo'
      and u.tipo = 'admin_global'
  )
  or exists (
    select 1
    from security.usuario_perfis up
    join security.perfis pf on pf.id = up.perfil_id and pf.status = 'ativo'
    join security.perfil_permissoes pp on pp.perfil_id = pf.id
    join security.permissoes p on p.id = pp.permissao_id and p.status = 'ativo'
    where up.usuario_id = auth.uid()
      and up.ativo = true
      and p.codigo = permissao_codigo
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS e grants
-- ---------------------------------------------------------------------------

alter table core.usuario_tipos enable row level security;
alter table core.apps enable row level security;
alter table core.carteiras enable row level security;
alter table core.times enable row level security;
alter table core.carteira_colaboradores enable row level security;
alter table core.time_colaboradores enable row level security;

alter table security.usuarios enable row level security;
alter table security.usuario_carteiras enable row level security;
alter table security.usuario_app_acessos enable row level security;
alter table security.perfis enable row level security;
alter table security.usuario_perfis enable row level security;
alter table security.permissoes enable row level security;
alter table security.perfil_permissoes enable row level security;

alter table audit.eventos enable row level security;

grant usage on schema core, security, audit to authenticated, service_role;
grant select on all tables in schema core to authenticated;
grant select on all tables in schema security to authenticated;
grant select on all tables in schema audit to authenticated;
grant all on all tables in schema core to service_role;
grant all on all tables in schema security to service_role;
grant all on all tables in schema audit to service_role;

do $$
declare
  rec record;
begin
  for rec in
    select schemaname, tablename
    from pg_tables
    where schemaname in ('core', 'security', 'audit')
  loop
    execute format('drop policy if exists %I on %I.%I', rec.tablename || '_service_role_all', rec.schemaname, rec.tablename);
    execute format(
      'create policy %I on %I.%I for all to service_role using (true) with check (true)',
      rec.tablename || '_service_role_all',
      rec.schemaname,
      rec.tablename
    );
  end loop;
end $$;

drop policy if exists usuarios_select_self_or_admin on security.usuarios;
create policy usuarios_select_self_or_admin on security.usuarios
for select to authenticated
using (id = auth.uid() or security.is_admin_global());

drop policy if exists apps_authenticated_read_active on core.apps;
create policy apps_authenticated_read_active on core.apps
for select to authenticated
using (status = 'ativo' or security.is_admin_global());

drop policy if exists usuario_app_acessos_select_self_or_admin on security.usuario_app_acessos;
create policy usuario_app_acessos_select_self_or_admin on security.usuario_app_acessos
for select to authenticated
using (usuario_id = auth.uid() or security.is_admin_global());

drop policy if exists usuario_perfis_select_self_or_admin on security.usuario_perfis;
create policy usuario_perfis_select_self_or_admin on security.usuario_perfis
for select to authenticated
using (usuario_id = auth.uid() or security.is_admin_global());

drop policy if exists usuario_carteiras_select_self_or_admin on security.usuario_carteiras;
create policy usuario_carteiras_select_self_or_admin on security.usuario_carteiras
for select to authenticated
using (usuario_id = auth.uid() or security.is_admin_global());

-- ---------------------------------------------------------------------------
-- Views administrativas usadas pelo app
-- ---------------------------------------------------------------------------

create or replace view security.v_usuarios_admin
with (security_invoker = true) as
select
  u.id,
  u.nome,
  u.email,
  u.tipo,
  u.tipo_id,
  ut.nome as tipo_nome,
  u.status,
  u.avatar_url,
  u.created_at,
  u.updated_at,
  coalesce(jsonb_agg(distinct jsonb_build_object('id', c.id, 'nome', c.nome)) filter (where c.id is not null), '[]'::jsonb) as carteiras,
  coalesce(jsonb_agg(distinct jsonb_build_object('id', a.id, 'codigo', a.codigo, 'nome', a.nome)) filter (where a.id is not null), '[]'::jsonb) as apps,
  coalesce(jsonb_agg(distinct jsonb_build_object('id', p.id, 'codigo', p.codigo, 'nome', p.nome)) filter (where p.id is not null), '[]'::jsonb) as perfis
from security.usuarios u
left join core.usuario_tipos ut on ut.id = u.tipo_id
left join security.usuario_carteiras uc on uc.usuario_id = u.id and uc.ativo = true
left join core.carteiras c on c.id = uc.carteira_id
left join security.usuario_app_acessos uaa on uaa.usuario_id = u.id and uaa.ativo = true
left join core.apps a on a.id = uaa.app_id
left join security.usuario_perfis up on up.usuario_id = u.id and up.ativo = true
left join security.perfis p on p.id = up.perfil_id
group by u.id, ut.nome;

create or replace view security.v_apps_admin
with (security_invoker = true) as
select
  a.*,
  count(distinct p.id)::integer as total_permissoes,
  count(distinct uaa.usuario_id)::integer as total_usuarios
from core.apps a
left join security.permissoes p on p.app_id = a.id
left join security.usuario_app_acessos uaa on uaa.app_id = a.id and uaa.ativo = true
group by a.id;

create or replace view security.v_perfis_admin
with (security_invoker = true) as
select
  p.*,
  a.codigo as app_codigo,
  a.nome as app_nome,
  count(distinct pp.permissao_id)::integer as total_permissoes,
  count(distinct up.usuario_id)::integer as total_usuarios
from security.perfis p
left join core.apps a on a.id = p.app_id
left join security.perfil_permissoes pp on pp.perfil_id = p.id
left join security.usuario_perfis up on up.perfil_id = p.id and up.ativo = true
group by p.id, a.codigo, a.nome;

create or replace view security.v_permissoes_admin
with (security_invoker = true) as
select
  p.*,
  a.codigo as app_codigo,
  a.nome as app_nome
from security.permissoes p
left join core.apps a on a.id = p.app_id;

create or replace view security.v_carteiras_admin
with (security_invoker = true) as
select
  c.*,
  count(distinct uc.usuario_id)::integer as total_usuarios,
  count(distinct cc.usuario_id)::integer as total_colaboradores
from core.carteiras c
left join security.usuario_carteiras uc on uc.carteira_id = c.id and uc.ativo = true
left join core.carteira_colaboradores cc on cc.carteira_id = c.id and cc.ativo = true
group by c.id;

create or replace view security.v_times_admin
with (security_invoker = true) as
select
  t.*,
  count(distinct tc.usuario_id)::integer as total_colaboradores
from core.times t
left join core.time_colaboradores tc on tc.time_id = t.id and tc.ativo = true
group by t.id;

create or replace view audit.v_eventos_admin
with (security_invoker = true) as
select
  e.*,
  u.nome as usuario_nome,
  u.email as usuario_email,
  c.nome as carteira_nome
from audit.eventos e
left join security.usuarios u on u.id = e.usuario_id
left join core.carteiras c on c.id = e.carteira_id;

grant select on security.v_usuarios_admin, security.v_apps_admin, security.v_perfis_admin,
  security.v_permissoes_admin, security.v_carteiras_admin, security.v_times_admin
  to authenticated, service_role;
grant select on audit.v_eventos_admin to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Seeds de base
-- ---------------------------------------------------------------------------

insert into core.usuario_tipos (codigo, nome, descricao, ativo, sistema)
values
  ('colaborador', 'Colaborador', 'Usuario interno/colaborador.', true, true),
  ('cliente', 'Cliente', 'Usuario cliente externo.', true, true),
  ('prestador', 'Prestador', 'Usuario prestador/parceiro.', true, true),
  ('outros', 'Outros', 'Tipo generico para usuarios sem classificacao especifica.', true, true)
on conflict (codigo) do update
set nome = excluded.nome,
    descricao = excluded.descricao,
    ativo = excluded.ativo,
    sistema = excluded.sistema,
    atualizado_em = now();

insert into core.apps (codigo, nome, descricao, status, url_path, ordem)
values
  ('painel', 'Painel', 'Hub operacional da plataforma.', 'ativo', '/modulos/painel', 10),
  ('core', 'Admin Core', 'Administracao de usuarios, acessos, apps e carteiras.', 'ativo', '/admin', 20),
  ('ciclo', 'GKIT Ciclo', 'Operacao de contratos, documentos, onboarding e regularidade.', 'ativo', '/modulos/gkit-ciclo', 30),
  ('colab', 'Colab', 'Area do colaborador.', 'ativo', '/modulos/colab', 40),
  ('gkit_new', 'GKIT New', 'CRM e oportunidades.', 'ativo', '/modulos/gkit-new', 50),
  ('gkit_flex', 'GKIT Flex', 'Gestao financeira operacional, comissoes, pagamentos, previsoes e cadastros.', 'ativo', '/modulos/gkit-flex', 60),
  ('gkit_jur', 'GKIT Jur', 'Modulo juridico operacional.', 'ativo', '/modulos/gkit-jur', 70),
  ('gkit_ate', 'GKIT Ate', 'Atendimento consultivo e tarefas.', 'ativo', '/modulos/gkit-ate', 80),
  ('gkit_dir', 'GKIT Dir', 'Diretoria e acompanhamento executivo.', 'ativo', '/modulos/gkit-dir', 90),
  ('gkit_performa', 'GKIT Performa', 'Rankings e performance.', 'ativo', '/modulos/gkit-performa', 100)
on conflict (codigo) do update
set nome = excluded.nome,
    descricao = excluded.descricao,
    status = excluded.status,
    url_path = excluded.url_path,
    ordem = excluded.ordem,
    updated_at = now();

insert into security.perfis (codigo, nome, descricao, nivel, app_id, status, sistema)
values
  ('admin_global', 'Admin Global', 'Acesso total a todos os modulos e administracao.', 0, null, 'ativo', true),
  ('operador', 'Operador', 'Perfil operacional base.', 50, null, 'ativo', true),
  ('visualizador', 'Visualizador', 'Perfil somente leitura.', 90, null, 'ativo', true)
on conflict (codigo) do update
set nome = excluded.nome,
    descricao = excluded.descricao,
    nivel = excluded.nivel,
    status = excluded.status,
    sistema = excluded.sistema,
    updated_at = now();

with perms(codigo, nome, descricao, app_codigo, recurso, acao) as (
  values
    ('admin.dashboard.read', 'Admin - dashboard', 'Acessar dashboard administrativo.', 'core', 'admin.dashboard', 'read'),
    ('admin.usuarios.read', 'Admin - ler usuarios', 'Consultar usuarios.', 'core', 'admin.usuarios', 'read'),
    ('admin.usuarios.write', 'Admin - gravar usuarios', 'Criar e alterar usuarios.', 'core', 'admin.usuarios', 'write'),
    ('admin.apps.read', 'Admin - ler apps', 'Consultar apps/modulos.', 'core', 'admin.apps', 'read'),
    ('admin.apps.write', 'Admin - gravar apps', 'Alterar apps/modulos.', 'core', 'admin.apps', 'write'),
    ('admin.perfis.read', 'Admin - ler perfis', 'Consultar perfis.', 'core', 'admin.perfis', 'read'),
    ('admin.perfis.write', 'Admin - gravar perfis', 'Criar e alterar perfis.', 'core', 'admin.perfis', 'write'),
    ('admin.permissoes.read', 'Admin - ler permissoes', 'Consultar permissoes.', 'core', 'admin.permissoes', 'read'),
    ('admin.carteiras.read', 'Admin - ler carteiras', 'Consultar carteiras.', 'core', 'admin.carteiras', 'read'),
    ('admin.carteiras.write', 'Admin - gravar carteiras', 'Criar e alterar carteiras.', 'core', 'admin.carteiras', 'write'),
    ('admin.times.read', 'Admin - ler times', 'Consultar times.', 'core', 'admin.times', 'read'),
    ('admin.times.write', 'Admin - gravar times', 'Criar e alterar times.', 'core', 'admin.times', 'write'),
    ('audit.eventos.read', 'Auditoria - ler eventos', 'Consultar eventos administrativos.', 'core', 'audit.eventos', 'read'),
    ('gkit_flex.dashboard.read', 'GKIT Flex - acessar app', 'Acessar app GKIT Flex.', 'gkit_flex', 'gkit_flex.dashboard', 'read'),
    ('gkit_flex.comissoes.read', 'GKIT Flex - ler comissoes', 'Consultar comissoes.', 'gkit_flex', 'gkit_flex.comissoes', 'read'),
    ('gkit_flex.comissoes.write', 'GKIT Flex - processar comissoes', 'Processar comissoes.', 'gkit_flex', 'gkit_flex.comissoes', 'write'),
    ('gkit_flex.contas_pagar.read', 'GKIT Flex - ler contas a pagar', 'Consultar contas a pagar.', 'gkit_flex', 'gkit_flex.contas_pagar', 'read'),
    ('gkit_flex.contas_pagar.write', 'GKIT Flex - gravar contas a pagar', 'Importar e editar contas a pagar.', 'gkit_flex', 'gkit_flex.contas_pagar', 'write'),
    ('gkit_flex.colaboradores.read', 'GKIT Flex - ler colaboradores', 'Consultar colaboradores Flex.', 'gkit_flex', 'gkit_flex.colaboradores', 'read'),
    ('gkit_flex.colaboradores.write', 'GKIT Flex - gravar colaboradores', 'Gerenciar colaboradores Flex.', 'gkit_flex', 'gkit_flex.colaboradores', 'write'),
    ('gkit_flex.cadastros.read', 'GKIT Flex - ler cadastros', 'Consultar cadastros Flex.', 'gkit_flex', 'gkit_flex.cadastros', 'read'),
    ('gkit_flex.cadastros.write', 'GKIT Flex - gravar cadastros', 'Gerenciar cadastros Flex.', 'gkit_flex', 'gkit_flex.cadastros', 'write'),
    ('gkit_flex.auditoria.read', 'GKIT Flex - auditoria', 'Consultar auditoria Flex.', 'gkit_flex', 'gkit_flex.auditoria', 'read'),
    ('gkit_new.read', 'GKIT New - ler', 'Consultar CRM GKIT New.', 'gkit_new', 'gkit_new', 'read'),
    ('gkit_new.write', 'GKIT New - gravar', 'Gerenciar CRM GKIT New.', 'gkit_new', 'gkit_new', 'write'),
    ('gkit_jur.read', 'GKIT Jur - ler', 'Consultar modulo juridico.', 'gkit_jur', 'gkit_jur', 'read'),
    ('gkit_jur.write', 'GKIT Jur - gravar', 'Gerenciar modulo juridico.', 'gkit_jur', 'gkit_jur', 'write'),
    ('gkit_ate.read', 'GKIT Ate - ler', 'Consultar atendimentos.', 'gkit_ate', 'gkit_ate', 'read'),
    ('gkit_ate.write', 'GKIT Ate - gravar', 'Gerenciar atendimentos.', 'gkit_ate', 'gkit_ate', 'write'),
    ('gkit_performa.read', 'GKIT Performa - ler', 'Consultar rankings.', 'gkit_performa', 'gkit_performa', 'read'),
    ('gkit_performa.write', 'GKIT Performa - gravar', 'Gerenciar rankings.', 'gkit_performa', 'gkit_performa', 'write'),
    ('ciclo.read', 'Ciclo - ler', 'Consultar Ciclo.', 'ciclo', 'ciclo', 'read'),
    ('ciclo.write', 'Ciclo - gravar', 'Gerenciar Ciclo.', 'ciclo', 'ciclo', 'write')
)
insert into security.permissoes (codigo, nome, descricao, app_id, recurso, acao, sistema, status)
select p.codigo, p.nome, p.descricao, a.id, p.recurso, p.acao, true, 'ativo'
from perms p
left join core.apps a on a.codigo = p.app_codigo
on conflict (codigo) do update
set nome = excluded.nome,
    descricao = excluded.descricao,
    app_id = excluded.app_id,
    recurso = excluded.recurso,
    acao = excluded.acao,
    sistema = excluded.sistema,
    status = excluded.status,
    updated_at = now();

insert into security.perfil_permissoes (perfil_id, permissao_id)
select pf.id, p.id
from security.perfis pf
cross join security.permissoes p
where pf.codigo = 'admin_global'
on conflict (perfil_id, permissao_id) do nothing;

commit;

-- ---------------------------------------------------------------------------
-- Criacao do primeiro admin
-- ---------------------------------------------------------------------------
-- O usuario precisa existir em auth.users antes. Crie-o pelo painel Supabase
-- ou pelo Admin Core, depois rode um bloco como este trocando os valores:
--
-- insert into security.usuarios (id, nome, email, tipo, status)
-- values ('00000000-0000-0000-0000-000000000000', 'Admin GEKALI', 'admin@gekali.com.br', 'admin_global', 'ativo')
-- on conflict (id) do update
-- set nome = excluded.nome, email = excluded.email, tipo = excluded.tipo, status = excluded.status, updated_at = now();
--
-- insert into security.usuario_perfis (usuario_id, perfil_id, ativo)
-- select '00000000-0000-0000-0000-000000000000', id, true
-- from security.perfis
-- where codigo = 'admin_global'
-- on conflict (usuario_id, perfil_id) do update set ativo = true;
--
-- insert into security.usuario_app_acessos (usuario_id, app_id, ativo)
-- select '00000000-0000-0000-0000-000000000000', id, true
-- from core.apps
-- where status = 'ativo'
-- on conflict (usuario_id, app_id) do update set ativo = true;
