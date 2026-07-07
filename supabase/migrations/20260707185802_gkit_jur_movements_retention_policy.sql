-- Retention policy for raw process movements.
-- Keep the hot table focused on recent operational signals while preserving
-- archived hashes so integrations do not reinsert old movements as new ones.

create table if not exists gkit_jur.movimentacoes_arquivo (
  id uuid not null,
  processo_id uuid not null references gkit_jur.processos(id) on delete cascade,
  codigo bigint,
  nome text not null,
  data_hora timestamptz,
  orgao_codigo bigint,
  orgao_nome text,
  complementos_tabelados jsonb not null default '[]'::jsonb,
  raw_movimento jsonb not null default '{}'::jsonb,
  hash_movimento text not null,
  origem text not null default 'datajud',
  relevante boolean not null default false,
  gera_alerta boolean not null default false,
  alerta_gerado boolean not null default false,
  created_at timestamptz not null default now(),
  archived_at timestamptz not null default now(),
  retention_policy text not null default 'keep_last_30',
  constraint gkit_jur_movimentacoes_arquivo_hash_unique unique (processo_id, hash_movimento)
);

create index if not exists idx_gkit_jur_movimentacoes_arquivo_processo_hash
  on gkit_jur.movimentacoes_arquivo(processo_id, hash_movimento);

create index if not exists idx_gkit_jur_movimentacoes_arquivo_archived_at
  on gkit_jur.movimentacoes_arquivo(archived_at desc);

create or replace function gkit_jur.aplicar_retencao_movimentacoes(
  p_processo_id uuid default null,
  p_keep_recent integer default 30,
  p_batch_size integer default 5000,
  p_dry_run boolean default true
)
returns table(
  candidatos_total integer,
  candidatos_lote integer,
  arquivados integer,
  removidos integer
)
language plpgsql
set search_path = ''
as $function$
begin
  if coalesce(p_keep_recent, 0) < 1 then
    raise exception 'p_keep_recent must be at least 1';
  end if;

  if coalesce(p_batch_size, 0) < 1 then
    raise exception 'p_batch_size must be at least 1';
  end if;

  return query
  with ranked as (
    select
      m.*,
      row_number() over (
        partition by m.processo_id
        order by m.data_hora desc nulls last, m.created_at desc, m.id desc
      ) as movement_rank
    from gkit_jur.movimentacoes m
    where p_processo_id is null or m.processo_id = p_processo_id
  ),
  candidates as (
    select ranked.*
    from ranked
    where ranked.movement_rank > p_keep_recent
      and ranked.relevante is false
      and ranked.gera_alerta is false
      and ranked.alerta_gerado is false
      and not exists (
        select 1
        from gkit_jur.tarefas t
        where t.processo_id = ranked.processo_id
          and (
            t.origem_hash = ranked.hash_movimento
            or coalesce(t.payload -> 'movimentacao_hashes', '[]'::jsonb) ? ranked.hash_movimento
          )
      )
  ),
  limited as (
    select *
    from candidates
    order by data_hora asc nulls first, created_at asc, id asc
    limit p_batch_size
  ),
  archived as (
    insert into gkit_jur.movimentacoes_arquivo (
      id,
      processo_id,
      codigo,
      nome,
      data_hora,
      orgao_codigo,
      orgao_nome,
      complementos_tabelados,
      raw_movimento,
      hash_movimento,
      origem,
      relevante,
      gera_alerta,
      alerta_gerado,
      created_at,
      archived_at,
      retention_policy
    )
    select
      limited.id,
      limited.processo_id,
      limited.codigo,
      limited.nome,
      limited.data_hora,
      limited.orgao_codigo,
      limited.orgao_nome,
      limited.complementos_tabelados,
      limited.raw_movimento,
      limited.hash_movimento,
      limited.origem,
      limited.relevante,
      limited.gera_alerta,
      limited.alerta_gerado,
      limited.created_at,
      now(),
      'keep_last_' || p_keep_recent::text
    from limited
    where not p_dry_run
    on conflict (processo_id, hash_movimento) do update
      set archived_at = excluded.archived_at,
          retention_policy = excluded.retention_policy
    returning id
  ),
  deleted as (
    delete from gkit_jur.movimentacoes m
    using limited
    where not p_dry_run
      and m.id = limited.id
    returning m.id
  )
  select
    (select count(*)::integer from candidates) as candidatos_total,
    (select count(*)::integer from limited) as candidatos_lote,
    (select count(*)::integer from archived) as arquivados,
    (select count(*)::integer from deleted) as removidos;
end;
$function$;

revoke all on function gkit_jur.aplicar_retencao_movimentacoes(uuid, integer, integer, boolean) from public, anon, authenticated;
grant execute on function gkit_jur.aplicar_retencao_movimentacoes(uuid, integer, integer, boolean) to service_role;
