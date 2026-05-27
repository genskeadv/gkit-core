-- GKLI Core - bootstrap completo para banco limpo
-- Execute este arquivo uma unica vez em uma base Supabase nova.
-- Conteudo combinado de 01_admin_core_p0_1.sql + 02_admin_core_p0_3.sql.

-- GKLI Core - P0.1 base estrutural limpa
-- Execute este arquivo antes do P0.3.

create schema if not exists core;
create schema if not exists security;
create schema if not exists audit;

create extension if not exists pgcrypto;

do $$ begin
  create type core.status_registro as enum ('ativo', 'inativo', 'arquivado');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type security.status_usuario as enum ('ativo', 'inativo', 'bloqueado', 'pendente');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type security.tipo_usuario as enum ('admin_global', 'admin_carteira', 'gestor', 'operador', 'visualizador');
exception when duplicate_object then null;
end $$;

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION core.normalize_text(value text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select lower(trim(regexp_replace(coalesce(value, ''), '\s+', ' ', 'g')));
$function$;


CREATE OR REPLACE FUNCTION core.only_digits(value text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select regexp_replace(coalesce(value, ''), '\D', '', 'g');
$function$;


CREATE OR REPLACE FUNCTION core.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;


CREATE OR REPLACE FUNCTION security.current_usuario_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE
AS $function$
  select auth.uid();
$function$;


CREATE OR REPLACE FUNCTION security.is_admin_global()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'security', 'core', 'public'
AS $function$
  select exists (
    select 1
    from security.usuarios u
    where u.id = auth.uid()
      and u.status = 'ativo'
      and u.tipo = 'admin_global'
  );
$function$;


CREATE OR REPLACE FUNCTION security.usuario_tem_app(p_app_codigo text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'security', 'core', 'public'
AS $function$
  select security.is_admin_global()
    or exists (
      select 1
      from security.usuario_app_acessos uaa
      join core.apps a on a.id = uaa.app_id
      join security.usuarios u on u.id = uaa.usuario_id
      where uaa.usuario_id = auth.uid()
        and a.codigo = p_app_codigo
        and uaa.ativo = true
        and u.status = 'ativo'
    );
$function$;


CREATE OR REPLACE FUNCTION security.usuario_tem_carteira(p_carteira_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'security', 'core', 'public'
AS $function$
  select security.is_admin_global()
    or exists (
      select 1
      from security.usuario_carteiras uc
      join security.usuarios u on u.id = uc.usuario_id
      where uc.usuario_id = auth.uid()
        and uc.carteira_id = p_carteira_id
        and uc.ativo = true
        and u.status = 'ativo'
    );
$function$;


CREATE OR REPLACE FUNCTION security.usuario_tem_permissao(p_codigo text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'security', 'core', 'public'
AS $function$
  select security.is_admin_global()
    or exists (
      select 1
      from security.usuario_perfis up
      join security.perfil_permissoes pp on pp.perfil_id = up.perfil_id
      join security.permissoes p on p.id = pp.permissao_id
      join security.usuarios u on u.id = up.usuario_id
      where up.usuario_id = auth.uid()
        and up.ativo = true
        and u.status = 'ativo'
        and p.codigo = p_codigo
        and p.status = 'ativo'
    );
$function$;


create table if not exists core."apps" (
  "id" uuid default gen_random_uuid() not null,
  "codigo" text not null,
  "nome" text not null,
  "descricao" text,
  "url_path" text,
  "ordem" integer default 100 not null,
  "status" core.status_registro default 'ativo'::core.status_registro not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  constraint "apps_codigo_check" CHECK ((codigo ~ '^[a-z0-9_]+$'::text)),
  constraint "apps_codigo_key" UNIQUE (codigo),
  constraint "apps_url_path_check" CHECK (((url_path IS NULL) OR ((url_path ~ '^/'::text) AND (url_path !~ '^//'::text)))),
  constraint "apps_pkey" PRIMARY KEY (id)
);

create table if not exists core."carteiras" (
  "id" uuid default gen_random_uuid() not null,
  "nome" text not null,
  "nome_normalizado" text generated always as (core.normalize_text(nome)) stored,
  "descricao" text,
  "logo_url" text,
  "cor_primaria" text,
  "status" core.status_registro default 'ativo'::core.status_registro not null,
  "metadata" jsonb default '{}'::jsonb not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  constraint "carteiras_pkey" PRIMARY KEY (id),
  constraint "carteiras_cor_check" CHECK (((cor_primaria IS NULL) OR (cor_primaria ~* '^#[0-9a-f]{6}$'::text))),
  constraint "carteiras_logo_url_check" CHECK (((logo_url IS NULL) OR (logo_url ~* '^https?://'::text))),
  constraint "carteiras_nome_len" CHECK (((char_length(TRIM(BOTH FROM nome)) >= 2) AND (char_length(TRIM(BOTH FROM nome)) <= 120)))
);

create table if not exists security."usuarios" (
  "id" uuid not null,
  "nome" text not null,
  "email" text not null,
  "email_normalizado" text,
  "tipo" security.tipo_usuario default 'operador'::security.tipo_usuario not null,
  "status" security.status_usuario default 'pendente'::security.status_usuario not null,
  "avatar_url" text,
  "ultimo_login_em" timestamp with time zone,
  "metadata" jsonb default '{}'::jsonb not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  constraint "usuarios_pkey" PRIMARY KEY (id),
  constraint "usuarios_email_check" CHECK ((email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'::text)),
  constraint "usuarios_nome_len" CHECK (((char_length(TRIM(BOTH FROM nome)) >= 2) AND (char_length(TRIM(BOTH FROM nome)) <= 160)))
);

create table if not exists security."perfis" (
  "id" uuid default gen_random_uuid() not null,
  "codigo" text not null,
  "nome" text not null,
  "descricao" text,
  "nivel" integer default 10 not null,
  "sistema" boolean default false not null,
  "status" core.status_registro default 'ativo'::core.status_registro not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "app_id" uuid,
  constraint "perfis_pkey" PRIMARY KEY (id),
  constraint "perfis_codigo_check" CHECK ((codigo ~ '^[a-z0-9_]+$'::text)),
  constraint "perfis_nivel_check" CHECK (((nivel >= 1) AND (nivel <= 999)))
);

create table if not exists security."permissoes" (
  "id" uuid default gen_random_uuid() not null,
  "codigo" text not null,
  "nome" text not null,
  "descricao" text,
  "app_id" uuid,
  "recurso" text not null,
  "acao" text not null,
  "sistema" boolean default false not null,
  "status" core.status_registro default 'ativo'::core.status_registro not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  constraint "permissoes_pkey" PRIMARY KEY (id),
  constraint "permissoes_codigo_check" CHECK ((codigo ~ '^[a-z0-9_.]+$'::text))
);

create table if not exists security."usuario_carteiras" (
  "id" uuid default gen_random_uuid() not null,
  "usuario_id" uuid not null,
  "carteira_id" uuid not null,
  "papel" text,
  "principal" boolean default false not null,
  "ativo" boolean default true not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  constraint "usuario_carteiras_usuario_id_carteira_id_key" UNIQUE (usuario_id, carteira_id),
  constraint "usuario_carteiras_pkey" PRIMARY KEY (id)
);

create table if not exists security."usuario_app_acessos" (
  "id" uuid default gen_random_uuid() not null,
  "usuario_id" uuid not null,
  "app_id" uuid not null,
  "ativo" boolean default true not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  constraint "usuario_app_acessos_usuario_id_app_id_key" UNIQUE (usuario_id, app_id),
  constraint "usuario_app_acessos_pkey" PRIMARY KEY (id)
);

create table if not exists security."usuario_perfis" (
  "id" uuid default gen_random_uuid() not null,
  "usuario_id" uuid not null,
  "perfil_id" uuid not null,
  "carteira_id" uuid,
  "app_id" uuid,
  "ativo" boolean default true not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  constraint "usuario_perfis_usuario_id_perfil_id_carteira_id_app_id_key" UNIQUE (usuario_id, perfil_id, carteira_id, app_id),
  constraint "usuario_perfis_pkey" PRIMARY KEY (id)
);

create table if not exists security."perfil_permissoes" (
  "id" uuid default gen_random_uuid() not null,
  "perfil_id" uuid not null,
  "permissao_id" uuid not null,
  "created_at" timestamp with time zone default now() not null,
  constraint "perfil_permissoes_perfil_id_permissao_id_key" UNIQUE (perfil_id, permissao_id),
  constraint "perfil_permissoes_pkey" PRIMARY KEY (id)
);

create table if not exists audit."eventos" (
  "id" uuid default gen_random_uuid() not null,
  "usuario_id" uuid,
  "app_codigo" text,
  "carteira_id" uuid,
  "acao" text not null,
  "entidade_schema" text,
  "entidade_tabela" text,
  "entidade_id" uuid,
  "descricao" text,
  "metadata" jsonb default '{}'::jsonb not null,
  "created_at" timestamp with time zone default now() not null,
  constraint "eventos_pkey" PRIMARY KEY (id),
  constraint "eventos_acao_check" CHECK ((acao ~ '^[a-z0-9_.]+$'::text))
);

do $$ begin
  alter table audit."eventos" add constraint "eventos_carteira_id_fkey" FOREIGN KEY (carteira_id) REFERENCES core.carteiras(id) ON DELETE SET NULL;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table audit."eventos" add constraint "eventos_usuario_id_fkey" FOREIGN KEY (usuario_id) REFERENCES security.usuarios(id) ON DELETE SET NULL;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table security."perfil_permissoes" add constraint "perfil_permissoes_perfil_id_fkey" FOREIGN KEY (perfil_id) REFERENCES security.perfis(id) ON DELETE CASCADE;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table security."perfil_permissoes" add constraint "perfil_permissoes_permissao_id_fkey" FOREIGN KEY (permissao_id) REFERENCES security.permissoes(id) ON DELETE CASCADE;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table security."perfis" add constraint "perfis_app_id_fkey" FOREIGN KEY (app_id) REFERENCES core.apps(id) ON DELETE SET NULL;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table security."permissoes" add constraint "permissoes_app_id_fkey" FOREIGN KEY (app_id) REFERENCES core.apps(id) ON DELETE CASCADE;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table security."usuario_app_acessos" add constraint "usuario_app_acessos_app_id_fkey" FOREIGN KEY (app_id) REFERENCES core.apps(id) ON DELETE CASCADE;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table security."usuario_app_acessos" add constraint "usuario_app_acessos_usuario_id_fkey" FOREIGN KEY (usuario_id) REFERENCES security.usuarios(id) ON DELETE CASCADE;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table security."usuario_carteiras" add constraint "usuario_carteiras_carteira_id_fkey" FOREIGN KEY (carteira_id) REFERENCES core.carteiras(id) ON DELETE CASCADE;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table security."usuario_carteiras" add constraint "usuario_carteiras_usuario_id_fkey" FOREIGN KEY (usuario_id) REFERENCES security.usuarios(id) ON DELETE CASCADE;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table security."usuario_perfis" add constraint "usuario_perfis_app_id_fkey" FOREIGN KEY (app_id) REFERENCES core.apps(id) ON DELETE CASCADE;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table security."usuario_perfis" add constraint "usuario_perfis_carteira_id_fkey" FOREIGN KEY (carteira_id) REFERENCES core.carteiras(id) ON DELETE CASCADE;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table security."usuario_perfis" add constraint "usuario_perfis_perfil_id_fkey" FOREIGN KEY (perfil_id) REFERENCES security.perfis(id) ON DELETE RESTRICT;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table security."usuario_perfis" add constraint "usuario_perfis_usuario_id_fkey" FOREIGN KEY (usuario_id) REFERENCES security.usuarios(id) ON DELETE CASCADE;
exception when duplicate_object then null;
end $$;

drop trigger if exists "trg_apps_updated_at" on core."apps";
CREATE TRIGGER trg_apps_updated_at BEFORE UPDATE ON core.apps FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

drop trigger if exists "trg_carteiras_updated_at" on core."carteiras";
CREATE TRIGGER trg_carteiras_updated_at BEFORE UPDATE ON core.carteiras FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

drop trigger if exists "trg_perfis_updated_at" on security."perfis";
CREATE TRIGGER trg_perfis_updated_at BEFORE UPDATE ON security.perfis FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

drop trigger if exists "trg_permissoes_updated_at" on security."permissoes";
CREATE TRIGGER trg_permissoes_updated_at BEFORE UPDATE ON security.permissoes FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

drop trigger if exists "trg_usuario_app_acessos_updated_at" on security."usuario_app_acessos";
CREATE TRIGGER trg_usuario_app_acessos_updated_at BEFORE UPDATE ON security.usuario_app_acessos FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

drop trigger if exists "trg_usuario_carteiras_updated_at" on security."usuario_carteiras";
CREATE TRIGGER trg_usuario_carteiras_updated_at BEFORE UPDATE ON security.usuario_carteiras FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

drop trigger if exists "trg_usuario_perfis_updated_at" on security."usuario_perfis";
CREATE TRIGGER trg_usuario_perfis_updated_at BEFORE UPDATE ON security.usuario_perfis FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

drop trigger if exists "trg_usuarios_updated_at" on security."usuarios";
CREATE TRIGGER trg_usuarios_updated_at BEFORE UPDATE ON security.usuarios FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE INDEX IF NOT EXISTS eventos_acao_idx ON audit.eventos USING btree (acao);
CREATE INDEX IF NOT EXISTS eventos_carteira_id_idx ON audit.eventos USING btree (carteira_id);
CREATE INDEX IF NOT EXISTS eventos_created_at_idx ON audit.eventos USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS eventos_usuario_id_idx ON audit.eventos USING btree (usuario_id);
CREATE UNIQUE INDEX IF NOT EXISTS carteiras_nome_normalizado_uidx ON core.carteiras USING btree (nome_normalizado);
CREATE INDEX IF NOT EXISTS perfis_app_id_idx ON security.perfis USING btree (app_id);
CREATE UNIQUE INDEX IF NOT EXISTS perfis_codigo_uidx ON security.perfis USING btree (codigo);
CREATE UNIQUE INDEX IF NOT EXISTS permissoes_codigo_uidx ON security.permissoes USING btree (codigo);
CREATE INDEX IF NOT EXISTS usuario_app_acessos_app_id_idx ON security.usuario_app_acessos USING btree (app_id);
CREATE INDEX IF NOT EXISTS usuario_app_acessos_usuario_id_idx ON security.usuario_app_acessos USING btree (usuario_id);
CREATE INDEX IF NOT EXISTS usuario_carteiras_carteira_id_idx ON security.usuario_carteiras USING btree (carteira_id);
CREATE INDEX IF NOT EXISTS usuario_carteiras_usuario_id_idx ON security.usuario_carteiras USING btree (usuario_id);
CREATE INDEX IF NOT EXISTS usuario_perfis_app_id_idx ON security.usuario_perfis USING btree (app_id);
CREATE INDEX IF NOT EXISTS usuario_perfis_carteira_id_idx ON security.usuario_perfis USING btree (carteira_id);
CREATE INDEX IF NOT EXISTS usuario_perfis_perfil_id_idx ON security.usuario_perfis USING btree (perfil_id);
CREATE INDEX IF NOT EXISTS usuario_perfis_usuario_id_idx ON security.usuario_perfis USING btree (usuario_id);
CREATE UNIQUE INDEX IF NOT EXISTS usuarios_email_normalizado_uidx ON security.usuarios USING btree (email_normalizado);

alter table core.apps enable row level security;
alter table core.carteiras enable row level security;
alter table security.usuarios enable row level security;
alter table security.perfis enable row level security;
alter table security.permissoes enable row level security;
alter table security.usuario_carteiras enable row level security;
alter table security.usuario_app_acessos enable row level security;
alter table security.usuario_perfis enable row level security;
alter table security.perfil_permissoes enable row level security;
alter table audit.eventos enable row level security;

drop policy if exists "eventos_insert_admin_global" on audit."eventos";
create policy "eventos_insert_admin_global" on audit."eventos" for insert to authenticated with check (security.is_admin_global());

drop policy if exists "eventos_select_admin_global" on audit."eventos";
create policy "eventos_select_admin_global" on audit."eventos" for select to authenticated using (security.is_admin_global());

drop policy if exists "apps_select_authenticated" on core."apps";
create policy "apps_select_authenticated" on core."apps" for select to authenticated using (((status = 'ativo'::core.status_registro) OR security.is_admin_global()));

drop policy if exists "carteiras_admin_global_all" on core."carteiras";
create policy "carteiras_admin_global_all" on core."carteiras" for all to authenticated using (security.is_admin_global()) with check (security.is_admin_global());

drop policy if exists "carteiras_select_scope" on core."carteiras";
create policy "carteiras_select_scope" on core."carteiras" for select to authenticated using ((security.is_admin_global() OR security.usuario_tem_carteira(id)));

drop policy if exists "perfil_permissoes_admin_global_all" on security."perfil_permissoes";
create policy "perfil_permissoes_admin_global_all" on security."perfil_permissoes" for all to authenticated using (security.is_admin_global()) with check (security.is_admin_global());

drop policy if exists "perfil_permissoes_select_authenticated" on security."perfil_permissoes";
create policy "perfil_permissoes_select_authenticated" on security."perfil_permissoes" for select to authenticated using (true);

drop policy if exists "perfis_admin_global_all" on security."perfis";
create policy "perfis_admin_global_all" on security."perfis" for all to authenticated using (security.is_admin_global()) with check (security.is_admin_global());

drop policy if exists "perfis_select_authenticated" on security."perfis";
create policy "perfis_select_authenticated" on security."perfis" for select to authenticated using (true);

drop policy if exists "permissoes_admin_global_all" on security."permissoes";
create policy "permissoes_admin_global_all" on security."permissoes" for all to authenticated using (security.is_admin_global()) with check (security.is_admin_global());

drop policy if exists "permissoes_select_authenticated" on security."permissoes";
create policy "permissoes_select_authenticated" on security."permissoes" for select to authenticated using (true);

drop policy if exists "usuario_app_acessos_admin_global_all" on security."usuario_app_acessos";
create policy "usuario_app_acessos_admin_global_all" on security."usuario_app_acessos" for all to authenticated using (security.is_admin_global()) with check (security.is_admin_global());

drop policy if exists "usuario_app_acessos_select_self_or_admin" on security."usuario_app_acessos";
create policy "usuario_app_acessos_select_self_or_admin" on security."usuario_app_acessos" for select to authenticated using (((usuario_id = auth.uid()) OR security.is_admin_global()));

drop policy if exists "usuario_carteiras_admin_global_all" on security."usuario_carteiras";
create policy "usuario_carteiras_admin_global_all" on security."usuario_carteiras" for all to authenticated using (security.is_admin_global()) with check (security.is_admin_global());

drop policy if exists "usuario_carteiras_select_self_or_admin" on security."usuario_carteiras";
create policy "usuario_carteiras_select_self_or_admin" on security."usuario_carteiras" for select to authenticated using (((usuario_id = auth.uid()) OR security.is_admin_global()));

drop policy if exists "usuario_perfis_admin_global_all" on security."usuario_perfis";
create policy "usuario_perfis_admin_global_all" on security."usuario_perfis" for all to authenticated using (security.is_admin_global()) with check (security.is_admin_global());

drop policy if exists "usuario_perfis_select_self_or_admin" on security."usuario_perfis";
create policy "usuario_perfis_select_self_or_admin" on security."usuario_perfis" for select to authenticated using (((usuario_id = auth.uid()) OR security.is_admin_global()));

drop policy if exists "usuarios_admin_global_all" on security."usuarios";
create policy "usuarios_admin_global_all" on security."usuarios" for all to authenticated using (security.is_admin_global()) with check (security.is_admin_global());

drop policy if exists "usuarios_select_self_or_admin" on security."usuarios";
create policy "usuarios_select_self_or_admin" on security."usuarios" for select to authenticated using (((id = auth.uid()) OR security.is_admin_global()));

set check_function_bodies = on;

-- Seeds, views e grants
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
