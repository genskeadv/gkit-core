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
