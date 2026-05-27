-- GKLI Core - P1 CRM
-- Execute depois do bootstrap do Core. No Supabase, exponha tambem o schema `crm`.

create schema if not exists crm;
create extension if not exists pgcrypto;

do $$ begin
  create type crm.tipo_pessoa as enum ('PF', 'PJ');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type crm.status_empresa as enum ('prospecto', 'ativo', 'inativo');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type crm.etapa_oportunidade as enum ('lead', 'diagnostico', 'proposta', 'negociacao', 'fechado', 'perdido');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type crm.status_oportunidade as enum ('aberta', 'ganha', 'perdida');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type crm.status_proposta as enum ('rascunho', 'enviada', 'aprovada', 'recusada', 'expirada');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type crm.tipo_atividade as enum ('ligacao', 'email', 'reuniao', 'tarefa', 'nota');
exception when duplicate_object then null;
end $$;

create table if not exists crm.empresas (
  id uuid default gen_random_uuid() not null,
  carteira_id uuid,
  nome text not null,
  nome_normalizado text generated always as (core.normalize_text(nome)) stored,
  documento text,
  documento_digitos text generated always as (core.only_digits(documento)) stored,
  tipo crm.tipo_pessoa default 'PJ'::crm.tipo_pessoa not null,
  segmento text,
  origem text,
  status crm.status_empresa default 'prospecto'::crm.status_empresa not null,
  responsavel_id uuid,
  observacoes text,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint empresas_pkey primary key (id),
  constraint empresas_nome_len check (char_length(trim(nome)) between 2 and 180)
);

create table if not exists crm.contatos (
  id uuid default gen_random_uuid() not null,
  nome text not null,
  nome_normalizado text generated always as (core.normalize_text(nome)) stored,
  email text,
  telefone text,
  cargo text,
  origem text,
  status core.status_registro default 'ativo'::core.status_registro not null,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint contatos_pkey primary key (id),
  constraint contatos_email_check check ((email is null) or (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$')),
  constraint contatos_nome_len check (char_length(trim(nome)) between 2 and 180)
);

create table if not exists crm.empresas_contatos (
  id uuid default gen_random_uuid() not null,
  empresa_id uuid not null,
  contato_id uuid not null,
  cargo text,
  decisor boolean default false not null,
  principal boolean default false not null,
  observacoes text,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint empresas_contatos_pkey primary key (id),
  constraint empresas_contatos_empresa_id_contato_id_key unique (empresa_id, contato_id)
);

create table if not exists crm.oportunidades (
  id uuid default gen_random_uuid() not null,
  carteira_id uuid,
  empresa_id uuid not null,
  contato_id uuid,
  titulo text not null,
  descricao text,
  etapa crm.etapa_oportunidade default 'lead'::crm.etapa_oportunidade not null,
  status crm.status_oportunidade default 'aberta'::crm.status_oportunidade not null,
  valor numeric(14,2) default 0 not null,
  probabilidade integer default 25 not null,
  origem text,
  responsavel_id uuid,
  proxima_acao text,
  data_ultima_interacao timestamp with time zone,
  data_proxima_acao timestamp with time zone,
  motivo_perda text,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint oportunidades_pkey primary key (id),
  constraint oportunidades_probabilidade_check check (probabilidade between 0 and 100),
  constraint oportunidades_titulo_len check (char_length(trim(titulo)) between 2 and 180),
  constraint oportunidades_valor_check check (valor >= 0)
);

create table if not exists crm.propostas (
  id uuid default gen_random_uuid() not null,
  oportunidade_id uuid not null,
  carteira_id uuid,
  numero text,
  titulo text not null,
  status crm.status_proposta default 'rascunho'::crm.status_proposta not null,
  valor_total numeric(14,2) default 0 not null,
  enviada_em timestamp with time zone,
  validade_em date,
  observacoes text,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint propostas_pkey primary key (id),
  constraint propostas_titulo_len check (char_length(trim(titulo)) between 2 and 180),
  constraint propostas_valor_total_check check (valor_total >= 0)
);

create table if not exists crm.atividades (
  id uuid default gen_random_uuid() not null,
  oportunidade_id uuid,
  empresa_id uuid,
  contato_id uuid,
  carteira_id uuid,
  usuario_id uuid,
  tipo crm.tipo_atividade default 'tarefa'::crm.tipo_atividade not null,
  titulo text not null,
  descricao text,
  realizada_em timestamp with time zone,
  prazo_em timestamp with time zone,
  concluida boolean default false not null,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint atividades_pkey primary key (id),
  constraint atividades_titulo_len check (char_length(trim(titulo)) between 2 and 180)
);

do $$ begin
  alter table crm.empresas add constraint empresas_carteira_id_fkey foreign key (carteira_id) references core.carteiras(id) on delete set null;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table crm.empresas add constraint empresas_responsavel_id_fkey foreign key (responsavel_id) references security.usuarios(id) on delete set null;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table crm.empresas_contatos add constraint empresas_contatos_empresa_id_fkey foreign key (empresa_id) references crm.empresas(id) on delete cascade;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table crm.empresas_contatos add constraint empresas_contatos_contato_id_fkey foreign key (contato_id) references crm.contatos(id) on delete cascade;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table crm.oportunidades add constraint oportunidades_carteira_id_fkey foreign key (carteira_id) references core.carteiras(id) on delete set null;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table crm.oportunidades add constraint oportunidades_empresa_id_fkey foreign key (empresa_id) references crm.empresas(id) on delete restrict;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table crm.oportunidades add constraint oportunidades_contato_id_fkey foreign key (contato_id) references crm.contatos(id) on delete set null;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table crm.oportunidades add constraint oportunidades_responsavel_id_fkey foreign key (responsavel_id) references security.usuarios(id) on delete set null;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table crm.propostas add constraint propostas_oportunidade_id_fkey foreign key (oportunidade_id) references crm.oportunidades(id) on delete cascade;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table crm.propostas add constraint propostas_carteira_id_fkey foreign key (carteira_id) references core.carteiras(id) on delete set null;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table crm.atividades add constraint atividades_oportunidade_id_fkey foreign key (oportunidade_id) references crm.oportunidades(id) on delete cascade;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table crm.atividades add constraint atividades_empresa_id_fkey foreign key (empresa_id) references crm.empresas(id) on delete cascade;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table crm.atividades add constraint atividades_contato_id_fkey foreign key (contato_id) references crm.contatos(id) on delete set null;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table crm.atividades add constraint atividades_carteira_id_fkey foreign key (carteira_id) references core.carteiras(id) on delete set null;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table crm.atividades add constraint atividades_usuario_id_fkey foreign key (usuario_id) references security.usuarios(id) on delete set null;
exception when duplicate_object then null;
end $$;

drop trigger if exists trg_empresas_updated_at on crm.empresas;
create trigger trg_empresas_updated_at before update on crm.empresas for each row execute function core.set_updated_at();

drop trigger if exists trg_contatos_updated_at on crm.contatos;
create trigger trg_contatos_updated_at before update on crm.contatos for each row execute function core.set_updated_at();

drop trigger if exists trg_empresas_contatos_updated_at on crm.empresas_contatos;
create trigger trg_empresas_contatos_updated_at before update on crm.empresas_contatos for each row execute function core.set_updated_at();

drop trigger if exists trg_oportunidades_updated_at on crm.oportunidades;
create trigger trg_oportunidades_updated_at before update on crm.oportunidades for each row execute function core.set_updated_at();

drop trigger if exists trg_propostas_updated_at on crm.propostas;
create trigger trg_propostas_updated_at before update on crm.propostas for each row execute function core.set_updated_at();

drop trigger if exists trg_atividades_updated_at on crm.atividades;
create trigger trg_atividades_updated_at before update on crm.atividades for each row execute function core.set_updated_at();

create unique index if not exists empresas_documento_uidx on crm.empresas using btree (documento_digitos) where documento_digitos <> '';
create index if not exists empresas_carteira_id_idx on crm.empresas using btree (carteira_id);
create index if not exists empresas_nome_normalizado_idx on crm.empresas using btree (nome_normalizado);
create index if not exists contatos_nome_normalizado_idx on crm.contatos using btree (nome_normalizado);
create index if not exists empresas_contatos_empresa_id_idx on crm.empresas_contatos using btree (empresa_id);
create index if not exists empresas_contatos_contato_id_idx on crm.empresas_contatos using btree (contato_id);
create index if not exists oportunidades_carteira_id_idx on crm.oportunidades using btree (carteira_id);
create index if not exists oportunidades_empresa_id_idx on crm.oportunidades using btree (empresa_id);
create index if not exists oportunidades_contato_id_idx on crm.oportunidades using btree (contato_id);
create index if not exists oportunidades_etapa_idx on crm.oportunidades using btree (etapa);
create index if not exists oportunidades_status_idx on crm.oportunidades using btree (status);
create index if not exists propostas_oportunidade_id_idx on crm.propostas using btree (oportunidade_id);
create index if not exists atividades_oportunidade_id_idx on crm.atividades using btree (oportunidade_id);
create index if not exists atividades_prazo_em_idx on crm.atividades using btree (prazo_em);

alter table crm.empresas enable row level security;
alter table crm.contatos enable row level security;
alter table crm.empresas_contatos enable row level security;
alter table crm.oportunidades enable row level security;
alter table crm.propostas enable row level security;
alter table crm.atividades enable row level security;

drop policy if exists empresas_select_crm_scope on crm.empresas;
create policy empresas_select_crm_scope on crm.empresas for select to authenticated using (
  security.usuario_tem_app('crm') and (carteira_id is null or security.usuario_tem_carteira(carteira_id))
);

drop policy if exists empresas_write_crm_scope on crm.empresas;
create policy empresas_write_crm_scope on crm.empresas for all to authenticated using (
  security.usuario_tem_permissao('crm.oportunidades.write') and (carteira_id is null or security.usuario_tem_carteira(carteira_id))
) with check (
  security.usuario_tem_permissao('crm.oportunidades.write') and (carteira_id is null or security.usuario_tem_carteira(carteira_id))
);

drop policy if exists contatos_select_crm_scope on crm.contatos;
create policy contatos_select_crm_scope on crm.contatos for select to authenticated using (security.usuario_tem_app('crm'));

drop policy if exists contatos_write_crm_scope on crm.contatos;
create policy contatos_write_crm_scope on crm.contatos for all to authenticated using (
  security.usuario_tem_permissao('crm.oportunidades.write')
) with check (
  security.usuario_tem_permissao('crm.oportunidades.write')
);

drop policy if exists empresas_contatos_select_crm_scope on crm.empresas_contatos;
create policy empresas_contatos_select_crm_scope on crm.empresas_contatos for select to authenticated using (
  security.usuario_tem_app('crm') and exists (
    select 1 from crm.empresas e
    where e.id = empresa_id
      and (e.carteira_id is null or security.usuario_tem_carteira(e.carteira_id))
  )
);

drop policy if exists empresas_contatos_write_crm_scope on crm.empresas_contatos;
create policy empresas_contatos_write_crm_scope on crm.empresas_contatos for all to authenticated using (
  security.usuario_tem_permissao('crm.oportunidades.write')
) with check (
  security.usuario_tem_permissao('crm.oportunidades.write')
);

drop policy if exists oportunidades_select_crm_scope on crm.oportunidades;
create policy oportunidades_select_crm_scope on crm.oportunidades for select to authenticated using (
  security.usuario_tem_permissao('crm.oportunidades.read') and (carteira_id is null or security.usuario_tem_carteira(carteira_id))
);

drop policy if exists oportunidades_write_crm_scope on crm.oportunidades;
create policy oportunidades_write_crm_scope on crm.oportunidades for all to authenticated using (
  security.usuario_tem_permissao('crm.oportunidades.write') and (carteira_id is null or security.usuario_tem_carteira(carteira_id))
) with check (
  security.usuario_tem_permissao('crm.oportunidades.write') and (carteira_id is null or security.usuario_tem_carteira(carteira_id))
);

drop policy if exists propostas_select_crm_scope on crm.propostas;
create policy propostas_select_crm_scope on crm.propostas for select to authenticated using (
  security.usuario_tem_permissao('crm.propostas.read') and (carteira_id is null or security.usuario_tem_carteira(carteira_id))
);

drop policy if exists propostas_write_crm_scope on crm.propostas;
create policy propostas_write_crm_scope on crm.propostas for all to authenticated using (
  security.usuario_tem_permissao('crm.propostas.write') and (carteira_id is null or security.usuario_tem_carteira(carteira_id))
) with check (
  security.usuario_tem_permissao('crm.propostas.write') and (carteira_id is null or security.usuario_tem_carteira(carteira_id))
);

drop policy if exists atividades_select_crm_scope on crm.atividades;
create policy atividades_select_crm_scope on crm.atividades for select to authenticated using (
  security.usuario_tem_app('crm') and (carteira_id is null or security.usuario_tem_carteira(carteira_id))
);

drop policy if exists atividades_write_crm_scope on crm.atividades;
create policy atividades_write_crm_scope on crm.atividades for all to authenticated using (
  security.usuario_tem_permissao('crm.oportunidades.write') and (carteira_id is null or security.usuario_tem_carteira(carteira_id))
) with check (
  security.usuario_tem_permissao('crm.oportunidades.write') and (carteira_id is null or security.usuario_tem_carteira(carteira_id))
);

grant usage on schema crm to authenticated, service_role;
grant select, insert, update, delete on all tables in schema crm to authenticated, service_role;
alter default privileges in schema crm grant select, insert, update, delete on tables to authenticated, service_role;
