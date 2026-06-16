-- GKIT New - bootstrap inicial
-- Objetivo: criar um schema novo e independente para o CRM 2.0.

begin;

create schema if not exists gkit_new;

create extension if not exists pgcrypto;

create or replace function gkit_new.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

create or replace function gkit_new.normalizar_documento(value text)
returns text
language sql
immutable
as $$
  select regexp_replace(coalesce(value, ''), '\D', '', 'g');
$$;

create or replace function gkit_new.tipo_documento(value text)
returns text
language sql
immutable
as $$
  select case
    when length(gkit_new.normalizar_documento(value)) = 11 then 'cpf'
    when length(gkit_new.normalizar_documento(value)) = 14 then 'cnpj'
    else null
  end;
$$;

create table if not exists gkit_new.clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  documento text not null,
  documento_tipo text not null check (documento_tipo in ('cpf', 'cnpj')),
  documento_normalizado text not null,
  status text not null default 'prospecto' check (status in ('prospecto', 'ativo')),
  observacoes text,
  criado_por uuid references security.usuarios(id) on delete set null,
  atualizado_por uuid references security.usuarios(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (documento_normalizado),
  check (
    (documento_tipo = 'cpf' and documento_normalizado ~ '^[0-9]{11}$')
    or
    (documento_tipo = 'cnpj' and documento_normalizado ~ '^[0-9]{14}$')
  )
);

create table if not exists gkit_new.contatos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  email text,
  celular text,
  criado_por uuid references security.usuarios(id) on delete set null,
  atualizado_por uuid references security.usuarios(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists gkit_new.cliente_contatos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references gkit_new.clientes(id) on delete cascade,
  contato_id uuid not null references gkit_new.contatos(id) on delete cascade,
  papel text,
  principal boolean not null default false,
  criado_em timestamptz not null default now(),
  unique (cliente_id, contato_id)
);

create table if not exists gkit_new.oportunidades (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references gkit_new.clientes(id) on delete restrict,
  contato_id uuid not null references gkit_new.contatos(id) on delete restrict,
  data date not null,
  descricao text not null,
  tipo text not null check (tipo in ('mensal', 'pontual')),
  valor numeric(14,2) not null default 0 check (valor >= 0),
  escopo text,
  status text not null default 'nova' check (status in ('nova', 'proposta_enviada', 'em_negociacao', 'aprovada', 'encerrada')),
  motivo_encerramento_antecipado text,
  responsavel_id uuid references security.usuarios(id) on delete set null,
  criado_por uuid references security.usuarios(id) on delete set null,
  atualizado_por uuid references security.usuarios(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  foreign key (cliente_id, contato_id) references gkit_new.cliente_contatos(cliente_id, contato_id)
);

create table if not exists gkit_new.tarefa_modelos (
  id uuid primary key default gen_random_uuid(),
  descricao text not null,
  dias integer not null default 0 check (dias >= 0),
  responsavel_id uuid references security.usuarios(id) on delete set null,
  ativo boolean not null default true,
  ordem integer not null default 100,
  criado_por uuid references security.usuarios(id) on delete set null,
  atualizado_por uuid references security.usuarios(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists gkit_new.tarefas (
  id uuid primary key default gen_random_uuid(),
  oportunidade_id uuid not null references gkit_new.oportunidades(id) on delete cascade,
  cliente_id uuid not null references gkit_new.clientes(id) on delete cascade,
  modelo_id uuid references gkit_new.tarefa_modelos(id) on delete set null,
  descricao text not null,
  data_prevista date not null,
  responsavel_id uuid references security.usuarios(id) on delete set null,
  status text not null default 'pendente' check (status in ('pendente', 'concluida', 'cancelada')),
  concluida_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (oportunidade_id, modelo_id)
);

create table if not exists gkit_new.eventos (
  id uuid primary key default gen_random_uuid(),
  entidade text not null,
  entidade_id uuid,
  usuario_id uuid references security.usuarios(id) on delete set null,
  tipo text not null,
  descricao text,
  metadata jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);

create or replace function gkit_new.preparar_cliente()
returns trigger
language plpgsql
as $$
begin
  new.documento_normalizado := gkit_new.normalizar_documento(new.documento);
  new.documento_tipo := gkit_new.tipo_documento(new.documento);

  if new.documento_tipo is null then
    raise exception 'Documento do cliente deve ser CPF ou CNPJ valido.';
  end if;

  new.documento := new.documento_normalizado;
  return new;
end;
$$;

create or replace function gkit_new.recalcular_status_cliente(p_cliente_id uuid)
returns void
language plpgsql
as $$
begin
  update gkit_new.clientes cliente
  set status = case
    when exists (
      select 1
      from gkit_new.oportunidades oportunidade
      where oportunidade.cliente_id = p_cliente_id
        and oportunidade.status = 'aprovada'
    ) then 'ativo'
    else 'prospecto'
  end
  where cliente.id = p_cliente_id;
end;
$$;

create or replace function gkit_new.criar_tarefas_oportunidade(p_oportunidade_id uuid)
returns void
language plpgsql
as $$
declare
  v_oportunidade record;
begin
  select id, cliente_id, criado_em
    into v_oportunidade
  from gkit_new.oportunidades
  where id = p_oportunidade_id;

  if v_oportunidade.id is null then
    return;
  end if;

  insert into gkit_new.tarefas (oportunidade_id, cliente_id, modelo_id, descricao, data_prevista, responsavel_id)
  select
    v_oportunidade.id,
    v_oportunidade.cliente_id,
    modelo.id,
    modelo.descricao,
    (v_oportunidade.criado_em::date + modelo.dias),
    modelo.responsavel_id
  from gkit_new.tarefa_modelos modelo
  where modelo.ativo = true
  on conflict (oportunidade_id, modelo_id) do nothing;
end;
$$;

create or replace function gkit_new.sincronizar_oportunidade()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and old.cliente_id is distinct from new.cliente_id then
    perform gkit_new.recalcular_status_cliente(old.cliente_id);
  end if;

  perform gkit_new.recalcular_status_cliente(new.cliente_id);

  if tg_op = 'INSERT' then
    perform gkit_new.criar_tarefas_oportunidade(new.id);
  end if;

  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'clientes',
    'contatos',
    'oportunidades',
    'tarefa_modelos',
    'tarefas'
  ]
  loop
    execute format('drop trigger if exists set_updated_at on gkit_new.%I', table_name);
    execute format(
      'create trigger set_updated_at before update on gkit_new.%I for each row execute function gkit_new.set_updated_at()',
      table_name
    );
  end loop;
end $$;

drop trigger if exists preparar_cliente on gkit_new.clientes;
create trigger preparar_cliente
before insert or update on gkit_new.clientes
for each row execute function gkit_new.preparar_cliente();

drop trigger if exists sincronizar_oportunidade on gkit_new.oportunidades;
create trigger sincronizar_oportunidade
after insert or update on gkit_new.oportunidades
for each row execute function gkit_new.sincronizar_oportunidade();

create index if not exists gkit_new_cliente_contatos_cliente_idx on gkit_new.cliente_contatos(cliente_id);
create index if not exists gkit_new_cliente_contatos_contato_idx on gkit_new.cliente_contatos(contato_id);
create index if not exists gkit_new_oportunidades_cliente_idx on gkit_new.oportunidades(cliente_id);
create index if not exists gkit_new_tarefas_responsavel_idx on gkit_new.tarefas(responsavel_id, status, data_prevista);

grant usage on schema gkit_new to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema gkit_new to service_role;
grant usage, select on all sequences in schema gkit_new to service_role;
alter default privileges in schema gkit_new grant select, insert, update, delete on tables to service_role;
alter default privileges in schema gkit_new grant usage, select on sequences to service_role;

insert into core.apps (codigo, nome, descricao, status, url_path, ordem)
values (
  'gkit_new',
  'GKIT New',
  'CRM 2.0 enxuto da GKIT Suite.',
  'ativo',
  '/modulos/gkit-new',
  25
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
    ('gkit_new.dashboard.read', 'GKIT New - cockpit', 'Acessar cockpit operacional.', 'gkit_new.dashboard', 'read', true, 'ativo'),
    ('gkit_new.clientes.read', 'GKIT New - ler clientes', 'Consultar clientes.', 'gkit_new.clientes', 'read', true, 'ativo'),
    ('gkit_new.clientes.write', 'GKIT New - gravar clientes', 'Criar e editar clientes.', 'gkit_new.clientes', 'write', true, 'ativo'),
    ('gkit_new.contatos.read', 'GKIT New - ler contatos', 'Consultar contatos.', 'gkit_new.contatos', 'read', true, 'ativo'),
    ('gkit_new.contatos.write', 'GKIT New - gravar contatos', 'Criar, editar e vincular contatos.', 'gkit_new.contatos', 'write', true, 'ativo'),
    ('gkit_new.oportunidades.read', 'GKIT New - ler oportunidades', 'Consultar oportunidades.', 'gkit_new.oportunidades', 'read', true, 'ativo'),
    ('gkit_new.oportunidades.write', 'GKIT New - gravar oportunidades', 'Criar e editar oportunidades.', 'gkit_new.oportunidades', 'write', true, 'ativo'),
    ('gkit_new.tarefas.read', 'GKIT New - ler tarefas', 'Consultar tarefas.', 'gkit_new.tarefas', 'read', true, 'ativo'),
    ('gkit_new.tarefas.write', 'GKIT New - gravar tarefas', 'Concluir ou alterar tarefas.', 'gkit_new.tarefas', 'write', true, 'ativo'),
    ('gkit_new.workflow.read', 'GKIT New - ler workflow', 'Consultar modelos de workflow.', 'gkit_new.workflow', 'read', true, 'ativo'),
    ('gkit_new.workflow.write', 'GKIT New - gravar workflow', 'Gerenciar modelos de workflow.', 'gkit_new.workflow', 'write', true, 'ativo'),
    ('gkit_new.gestao.read', 'GKIT New - gestão', 'Acessar visão gerencial.', 'gkit_new.gestao', 'read', true, 'ativo')
)
insert into security.permissoes (codigo, nome, descricao, app_id, recurso, acao, sistema, status)
select rows.codigo, rows.nome, rows.descricao, apps.id, rows.recurso, rows.acao, rows.sistema, rows.status::core.status_registro
from rows
left join core.apps apps on apps.codigo = 'gkit_new'
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
