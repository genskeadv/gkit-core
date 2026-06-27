-- GKIT ATE - bootstrap inicial
-- Modulo de atendimento consultivo importado do ASTREA, com tarefas 1:N por atendimento.

begin;

create schema if not exists gkit_ate;
create schema if not exists extensions;

create extension if not exists pgcrypto;
create extension if not exists unaccent with schema extensions;

create or replace function gkit_ate.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

create or replace function gkit_ate.normalizar_slug(value text)
returns text
language sql
immutable
set search_path = gkit_ate, extensions, pg_temp
as $$
  select trim(both '-' from regexp_replace(
    lower(extensions.unaccent(coalesce(value, ''))),
    '[^a-z0-9]+',
    '-',
    'g'
  ));
$$;

create or replace function gkit_ate.gerar_codigo_atendimento(p_base timestamptz default now())
returns text
language plpgsql
as $$
declare
  v_base timestamptz := coalesce(p_base, now());
  v_offset integer := 0;
  v_codigo text;
begin
  loop
    v_codigo := 'ATE' || to_char(v_base + make_interval(mins => v_offset), 'DDMMYYHH24MI');
    exit when not exists (
      select 1
      from gkit_ate.atendimentos
      where codigo_publico = v_codigo
    );
    v_offset := v_offset + 1;
  end loop;

  return v_codigo;
end;
$$;

create table if not exists gkit_ate.tarefa_tipos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text not null unique,
  descricao_padrao text not null,
  ativo boolean not null default true,
  criado_por uuid references security.usuarios(id) on delete set null,
  atualizado_por uuid references security.usuarios(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists gkit_ate.atendimento_tipos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text not null unique,
  tarefa_tipo_id uuid references gkit_ate.tarefa_tipos(id) on delete set null,
  ativo boolean not null default true,
  criado_por uuid references security.usuarios(id) on delete set null,
  atualizado_por uuid references security.usuarios(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists gkit_ate.atendimentos (
  id uuid primary key default gen_random_uuid(),
  codigo_publico text not null unique default gkit_ate.gerar_codigo_atendimento(),
  source_key text not null unique,
  astrea_codigo text,
  atendimento_tipo_id uuid references gkit_ate.atendimento_tipos(id) on delete set null,
  tipo text,
  titulo text not null,
  papel_cliente text,
  cliente_nome text not null,
  outros_clientes text,
  outros_envolvidos text,
  pasta text,
  acao text,
  numero text,
  data_distribuicao date,
  objeto text,
  observacoes text,
  materia text,
  detalhes text,
  valor_original numeric(14,2),
  valor_total_envolvido numeric(14,2),
  valor_total_provisao numeric(14,2),
  valor_causa numeric(14,2),
  valor_condenacao numeric(14,2),
  decisao_processo text,
  resultado_processo text,
  etiquetas text[] not null default '{}'::text[],
  data_criacao timestamptz,
  prazo_finalizacao date,
  data_encerramento timestamptz,
  data_ultimo_historico timestamptz,
  ultimo_historico text,
  instancia_original text,
  instancia_atual text,
  url_processo text,
  numero_juizo text,
  vara text,
  foro text,
  responsavel text,
  acesso text,
  status text not null default 'aberto' check (status in ('aberto', 'encerrado')),
  metadata jsonb not null default '{}'::jsonb,
  criado_por uuid references security.usuarios(id) on delete set null,
  atualizado_por uuid references security.usuarios(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists gkit_ate.tarefas (
  id uuid primary key default gen_random_uuid(),
  atendimento_id uuid not null references gkit_ate.atendimentos(id) on delete cascade,
  tarefa_tipo_id uuid references gkit_ate.tarefa_tipos(id) on delete set null,
  source_key text,
  descricao text not null,
  responsavel text,
  data_prevista date,
  data_conclusao timestamptz,
  status text not null default 'pendente' check (status in ('pendente', 'em_andamento', 'concluida', 'cancelada')),
  origem text not null default 'manual',
  metadata jsonb not null default '{}'::jsonb,
  criado_por uuid references security.usuarios(id) on delete set null,
  atualizado_por uuid references security.usuarios(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (atendimento_id, source_key)
);

alter table gkit_ate.atendimentos
  add column if not exists codigo_publico text,
  add column if not exists atendimento_tipo_id uuid references gkit_ate.atendimento_tipos(id) on delete set null,
  add column if not exists prazo_finalizacao date;

do $$
declare
  atendimento record;
begin
  for atendimento in
    select id, data_criacao, criado_em
    from gkit_ate.atendimentos
    where codigo_publico is null
    order by criado_em nulls last, id
  loop
    update gkit_ate.atendimentos
    set codigo_publico = gkit_ate.gerar_codigo_atendimento(coalesce(atendimento.data_criacao, atendimento.criado_em, now()))
    where id = atendimento.id;
  end loop;
end $$;

alter table gkit_ate.atendimentos
  alter column codigo_publico set default gkit_ate.gerar_codigo_atendimento(),
  alter column codigo_publico set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'gkit_ate_atendimentos_codigo_publico_key'
      and conrelid = 'gkit_ate.atendimentos'::regclass
  ) then
    alter table gkit_ate.atendimentos
      add constraint gkit_ate_atendimentos_codigo_publico_key unique (codigo_publico);
  end if;
end $$;

alter table gkit_ate.tarefas
  add column if not exists tarefa_tipo_id uuid references gkit_ate.tarefa_tipos(id) on delete set null;

create table if not exists gkit_ate.import_lotes (
  id uuid primary key default gen_random_uuid(),
  tipo text not null default 'astrea_processos',
  status text not null default 'processando' check (status in ('processando', 'concluido', 'parcial', 'falhou')),
  arquivo_nome text,
  arquivo_tamanho bigint,
  total_linhas integer not null default 0,
  linhas_validas integer not null default 0,
  atendimentos_criados integer not null default 0,
  atendimentos_atualizados integer not null default 0,
  linhas_ignoradas integer not null default 0,
  erro text,
  metadata jsonb not null default '{}'::jsonb,
  criado_por uuid references security.usuarios(id) on delete set null,
  criado_em timestamptz not null default now(),
  finalizado_em timestamptz
);

create table if not exists gkit_ate.import_itens (
  id uuid primary key default gen_random_uuid(),
  lote_id uuid not null references gkit_ate.import_lotes(id) on delete cascade,
  atendimento_id uuid references gkit_ate.atendimentos(id) on delete set null,
  linha integer not null,
  source_key text,
  acao text not null check (acao in ('criar', 'atualizar', 'ignorar', 'erro')),
  status text not null check (status in ('sucesso', 'ignorado', 'erro')),
  cliente_nome text,
  titulo text,
  mensagem text,
  payload jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);

create or replace function gkit_ate.validar_atendimento_com_tarefa_aberta()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1
    from gkit_ate.atendimentos atendimento
    where atendimento.status = 'aberto'
      and not exists (
        select 1
        from gkit_ate.tarefas tarefa
        where tarefa.atendimento_id = atendimento.id
          and tarefa.status in ('pendente', 'em_andamento')
      )
  ) then
    raise exception 'Atendimento aberto precisa ter pelo menos uma tarefa aberta.';
  end if;

  return null;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['atendimentos', 'tarefas']
  loop
    execute format('drop trigger if exists set_updated_at on gkit_ate.%I', table_name);
    execute format(
      'create trigger set_updated_at before update on gkit_ate.%I for each row execute function gkit_ate.set_updated_at()',
      table_name
    );
  end loop;
end $$;

drop trigger if exists validar_atendimento_com_tarefa_aberta_tarefas on gkit_ate.tarefas;
create constraint trigger validar_atendimento_com_tarefa_aberta_tarefas
after insert or update or delete on gkit_ate.tarefas
deferrable initially deferred
for each row execute function gkit_ate.validar_atendimento_com_tarefa_aberta();

create index if not exists gkit_ate_atendimento_tipos_slug_idx on gkit_ate.atendimento_tipos(slug);
create index if not exists gkit_ate_tarefa_tipos_slug_idx on gkit_ate.tarefa_tipos(slug);
create index if not exists gkit_ate_atendimentos_cliente_idx on gkit_ate.atendimentos(cliente_nome);
create index if not exists gkit_ate_atendimentos_codigo_publico_idx on gkit_ate.atendimentos(codigo_publico);
create index if not exists gkit_ate_atendimentos_tipo_idx on gkit_ate.atendimentos(atendimento_tipo_id);
create index if not exists gkit_ate_atendimentos_status_idx on gkit_ate.atendimentos(status, data_criacao desc);
create index if not exists gkit_ate_atendimentos_responsavel_idx on gkit_ate.atendimentos(responsavel);
create index if not exists gkit_ate_tarefas_atendimento_idx on gkit_ate.tarefas(atendimento_id);
create index if not exists gkit_ate_tarefas_tipo_idx on gkit_ate.tarefas(tarefa_tipo_id);
create index if not exists gkit_ate_tarefas_status_idx on gkit_ate.tarefas(status, data_prevista);
create index if not exists gkit_ate_import_itens_lote_idx on gkit_ate.import_itens(lote_id, linha);

alter table gkit_ate.atendimento_tipos enable row level security;
alter table gkit_ate.tarefa_tipos enable row level security;
alter table gkit_ate.atendimentos enable row level security;
alter table gkit_ate.tarefas enable row level security;
alter table gkit_ate.import_lotes enable row level security;
alter table gkit_ate.import_itens enable row level security;

grant usage on schema gkit_ate to service_role;
grant select, insert, update, delete on all tables in schema gkit_ate to service_role;
grant usage, select on all sequences in schema gkit_ate to service_role;
grant execute on all functions in schema gkit_ate to service_role;

alter default privileges in schema gkit_ate
  grant select, insert, update, delete on tables to service_role;

alter default privileges in schema gkit_ate
  grant usage, select on sequences to service_role;

alter default privileges in schema gkit_ate
  grant execute on functions to service_role;

insert into core.apps (codigo, nome, descricao, status, url_path, ordem)
values (
  'gkit_ate',
  'GKIT ATE',
  'Atendimentos consultivos importados do ASTREA, com tarefas vinculadas.',
  'ativo',
  '/modulos/gkit-ate',
  30
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
    ('gkit_ate.dashboard.read', 'GKIT ATE - cockpit', 'Acessar cockpit de atendimentos.', 'gkit_ate.dashboard', 'read', true, 'ativo'),
    ('gkit_ate.atendimentos.read', 'GKIT ATE - ler atendimentos', 'Consultar atendimentos.', 'gkit_ate.atendimentos', 'read', true, 'ativo'),
    ('gkit_ate.atendimentos.write', 'GKIT ATE - gravar atendimentos', 'Importar e editar atendimentos.', 'gkit_ate.atendimentos', 'write', true, 'ativo'),
    ('gkit_ate.cadastros.read', 'GKIT ATE - ler cadastros', 'Consultar tipos de atendimento e tarefa.', 'gkit_ate.cadastros', 'read', true, 'ativo'),
    ('gkit_ate.cadastros.write', 'GKIT ATE - gravar cadastros', 'Criar e editar tipos de atendimento e tarefa.', 'gkit_ate.cadastros', 'write', true, 'ativo'),
    ('gkit_ate.tarefas.read', 'GKIT ATE - ler tarefas', 'Consultar tarefas vinculadas aos atendimentos.', 'gkit_ate.tarefas', 'read', true, 'ativo'),
    ('gkit_ate.tarefas.write', 'GKIT ATE - gravar tarefas', 'Criar, concluir e alterar tarefas.', 'gkit_ate.tarefas', 'write', true, 'ativo'),
    ('gkit_ate.importacoes.read', 'GKIT ATE - ler importacoes', 'Consultar historico de importacoes.', 'gkit_ate.importacoes', 'read', true, 'ativo'),
    ('gkit_ate.importacoes.write', 'GKIT ATE - importar ASTREA', 'Importar planilhas ASTREA.', 'gkit_ate.importacoes', 'write', true, 'ativo')
)
insert into security.permissoes (codigo, nome, descricao, app_id, recurso, acao, sistema, status)
select rows.codigo, rows.nome, rows.descricao, apps.id, rows.recurso, rows.acao, rows.sistema, rows.status::core.status_registro
from rows
left join core.apps apps on apps.codigo = 'gkit_ate'
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
