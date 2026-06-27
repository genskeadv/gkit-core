begin;

create schema if not exists gkit_performa;

create extension if not exists pgcrypto;

create table if not exists gkit_performa.ranking_lotes (
  id uuid primary key default gen_random_uuid(),
  arquivo_nome text not null,
  sheet_name text,
  ranking_tipo text not null check (ranking_tipo in ('responsavel', 'executor')),
  filtros jsonb not null default '{}'::jsonb,
  resumo jsonb not null default '{}'::jsonb,
  total_registros integer not null default 0,
  total_unidades integer not null default 0,
  total_ranqueados integer not null default 0,
  criado_por uuid references security.usuarios(id) on delete set null,
  criado_em timestamptz not null default now()
);

create table if not exists gkit_performa.ranking_itens (
  id uuid primary key default gen_random_uuid(),
  lote_id uuid not null references gkit_performa.ranking_lotes(id) on delete cascade,
  posicao integer not null,
  nome text not null,
  unidades integer not null default 0,
  concluidas integer not null default 0,
  percentual_conclusao numeric(8,4) not null default 0,
  no_prazo integer not null default 0,
  percentual_no_prazo numeric(8,4) not null default 0,
  abertas_atrasadas integer not null default 0,
  media_dias numeric(10,2) not null default 0,
  score numeric(10,4) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  unique (lote_id, posicao),
  unique (lote_id, nome)
);

create index if not exists gkit_performa_ranking_lotes_criado_em_idx
  on gkit_performa.ranking_lotes (criado_em desc);

create index if not exists gkit_performa_ranking_lotes_tipo_idx
  on gkit_performa.ranking_lotes (ranking_tipo, criado_em desc);

create index if not exists gkit_performa_ranking_itens_lote_score_idx
  on gkit_performa.ranking_itens (lote_id, score desc);

alter table gkit_performa.ranking_lotes enable row level security;
alter table gkit_performa.ranking_itens enable row level security;

grant usage on schema gkit_performa to service_role;
grant select, insert, update, delete on all tables in schema gkit_performa to service_role;
grant usage, select on all sequences in schema gkit_performa to service_role;

alter default privileges in schema gkit_performa
  grant select, insert, update, delete on tables to service_role;

alter default privileges in schema gkit_performa
  grant usage, select on sequences to service_role;

do $$
declare
  existing_schemas text;
  next_schemas text;
begin
  select substring(config from 'pgrst\.db_schemas=(.*)')
    into existing_schemas
  from (
    select unnest(rolconfig) as config
    from pg_roles
    where rolname = 'authenticator'
  ) role_config
  where config like 'pgrst.db_schemas=%'
  limit 1;

  existing_schemas := coalesce(existing_schemas, 'public');

  if not exists (
    select 1
    from regexp_split_to_table(existing_schemas, '\s*,\s*') as schema_name
    where schema_name = 'gkit_performa'
  ) then
    next_schemas := existing_schemas || ', gkit_performa';
    execute format('alter role authenticator set pgrst.db_schemas = %L', next_schemas);
    notify pgrst, 'reload config';
  end if;
end $$;

with rows(codigo, nome, descricao, recurso, acao, sistema, status) as (
  values
    (
      'gkit_performa.rankings.read',
      'GKIT Performa - ler rankings',
      'Consultar rankings gravados para comparativos.',
      'gkit_performa.rankings',
      'read',
      true,
      'ativo'
    ),
    (
      'gkit_performa.rankings.write',
      'GKIT Performa - gravar rankings',
      'Gravar snapshots de ranking da agenda.',
      'gkit_performa.rankings',
      'write',
      true,
      'ativo'
    )
)
insert into security.permissoes (codigo, nome, descricao, app_id, recurso, acao, sistema, status)
select rows.codigo, rows.nome, rows.descricao, apps.id, rows.recurso, rows.acao, rows.sistema, rows.status::core.status_registro
from rows
left join core.apps apps on apps.codigo = 'gkit_performa'
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
