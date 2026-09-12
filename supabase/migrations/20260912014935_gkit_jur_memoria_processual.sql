begin;

alter table if exists gkit_jur.processos
  add column if not exists tipo_acompanhamento text not null default 'atuacao_genske',
  add column if not exists escritorio_responsavel_nome text,
  add column if not exists escritorio_responsavel_contato text,
  add column if not exists acompanhamento_autorizado_em timestamptz,
  add column if not exists acompanhamento_autorizado_por uuid references security.usuarios(id) on delete set null,
  add column if not exists acompanhamento_observacoes text,
  add column if not exists incluir_relatorio_mensal boolean not null default true;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'gkit_jur_processos_tipo_acompanhamento_check'
      and conrelid = 'gkit_jur.processos'::regclass
  ) then
    alter table gkit_jur.processos
      add constraint gkit_jur_processos_tipo_acompanhamento_check
      check (
        tipo_acompanhamento in (
          'atuacao_genske',
          'cliente_mensal_outro_escritorio',
          'apoio_consultivo',
          'somente_ciencia'
        )
      );
  end if;
end $$;

update gkit_jur.processos
set
  status_monitoramento = 'nao_monitorar',
  updated_at = now()
where tipo_acompanhamento = 'cliente_mensal_outro_escritorio'
  and acompanhamento_autorizado_em is null
  and status_monitoramento = 'monitorando';

create index if not exists idx_gkit_jur_processos_tipo_acompanhamento
  on gkit_jur.processos(tipo_acompanhamento, status);

create index if not exists idx_gkit_jur_processos_externos_monitoramento
  on gkit_jur.processos(status, status_monitoramento, acompanhamento_autorizado_em)
  where tipo_acompanhamento = 'cliente_mensal_outro_escritorio';

create index if not exists idx_gkit_jur_processos_escritorio_responsavel
  on gkit_jur.processos using gin (to_tsvector('simple', coalesce(escritorio_responsavel_nome, '')));

create index if not exists idx_gkit_jur_processos_relatorio_mensal
  on gkit_jur.processos(incluir_relatorio_mensal, tipo_acompanhamento, status)
  where incluir_relatorio_mensal is true;

drop function if exists gkit_jur.proximos_processos_sync(integer, text, uuid, uuid[], timestamptz);

create or replace function gkit_jur.proximos_processos_sync(
  p_limit integer default 25,
  p_tribunal text default null,
  p_processo_id uuid default null,
  p_exclude_ids uuid[] default '{}'::uuid[],
  p_synced_before timestamptz default null
)
returns table(
  id uuid,
  numero_cnj text,
  numero_cnj_limpo text,
  tribunal_alias text,
  carteira_id uuid,
  responsavel_id uuid,
  nivel_prontidao text
)
language sql
stable
set search_path = ''
as $function$
  with base as (
    select
      p.id,
      p.numero_cnj,
      p.numero_cnj_limpo,
      p.tribunal_alias,
      p.carteira_id,
      p.responsavel_id,
      coalesce(r.nivel_prontidao, 'sem_base') as nivel_prontidao,
      case coalesce(r.nivel_prontidao, 'sem_base')
        when 'sem_base' then 0
        when 'capa' then 1
        when 'parcial' then 2
        when 'desatualizado' then 3
        when 'erro' then 4
        when 'pronto' then 5
        else 6
      end as prontidao_rank,
      case
        when exists (
          select 1
          from gkit_jur.tarefas t
          where t.processo_id = p.id
            and t.status in ('aberta', 'em_andamento', 'aguardando_terceiro')
        ) then 0
        when exists (
          select 1
          from gkit_jur.publicacoes_monitoradas pub
          where pub.numero_cnj_limpo = p.numero_cnj_limpo
            and pub.status in ('pendente', 'triada_ia', 'em_tratamento', 'erro')
        ) then 1
        when exists (
          select 1
          from gkit_jur.acordos_judiciais a
          where a.processo_id = p.id
            and a.status = 'ativo'
        ) then 2
        when p.ultima_sincronizacao_com_resultado_em is null then 3
        else 4
      end as acionavel_rank,
      p.ultima_sincronizacao_em,
      p.ultima_tentativa_sincronizacao_em,
      p.ultima_sincronizacao_com_resultado_em,
      p.proxima_tentativa_sincronizacao_em,
      p.updated_at,
      coalesce(p.falhas_transientes_consecutivas, 0) as transient_failures
    from gkit_jur.processos p
    left join gkit_jur.processos_resumos r on r.processo_id = p.id
    where p.status = 'ativo'
      and p.tribunal_alias is not null
      and (p_processo_id is null or p.id = p_processo_id)
      and (p_processo_id is not null or p.status_monitoramento = 'monitorando')
      and (
        p_processo_id is not null
        or p.tipo_acompanhamento <> 'cliente_mensal_outro_escritorio'
        or p.acompanhamento_autorizado_em is not null
      )
      and (
        p_processo_id is not null
        or coalesce(array_length(p_exclude_ids, 1), 0) = 0
        or p.id <> all(p_exclude_ids)
      )
      and (
        p_processo_id is not null
        or p_synced_before is null
        or p.ultima_sincronizacao_com_resultado_em is null
        or p.ultima_sincronizacao_com_resultado_em < p_synced_before
      )
      and (
        p_processo_id is not null
        or p.proxima_tentativa_sincronizacao_em is null
        or p.proxima_tentativa_sincronizacao_em <= now()
      )
      and (p_tribunal is null or p.tribunal_sigla = p_tribunal)
  ),
  ranked as (
    select
      base.*,
      row_number() over (
        partition by base.acionavel_rank, base.transient_failures, base.prontidao_rank, base.tribunal_alias
        order by
          base.ultima_sincronizacao_com_resultado_em asc nulls first,
          base.ultima_tentativa_sincronizacao_em asc nulls first,
          base.updated_at asc nulls first
      ) as tribunal_round
    from base
  )
  select
    ranked.id,
    ranked.numero_cnj,
    ranked.numero_cnj_limpo,
    ranked.tribunal_alias,
    ranked.carteira_id,
    ranked.responsavel_id,
    ranked.nivel_prontidao
  from ranked
  order by
    case when p_processo_id is not null then 0 else ranked.acionavel_rank end,
    case when p_processo_id is not null then 0 else ranked.transient_failures end,
    ranked.prontidao_rank,
    ranked.tribunal_round,
    ranked.ultima_sincronizacao_com_resultado_em asc nulls first,
    ranked.ultima_tentativa_sincronizacao_em asc nulls first,
    ranked.updated_at asc nulls first
  limit greatest(1, least(coalesce(p_limit, 25), 25));
$function$;

revoke all on function gkit_jur.proximos_processos_sync(integer, text, uuid, uuid[], timestamptz) from public, anon, authenticated;
grant execute on function gkit_jur.proximos_processos_sync(integer, text, uuid, uuid[], timestamptz) to service_role;

comment on column gkit_jur.processos.tipo_acompanhamento is 'Papel operacional do Genske no processo: atuacao direta, acompanhamento de cliente mensal por outro escritorio, apoio consultivo ou somente ciencia.';
comment on column gkit_jur.processos.escritorio_responsavel_nome is 'Escritorio terceiro responsavel pela conducao direta quando o Genske acompanha apenas como memoria processual.';
comment on column gkit_jur.processos.escritorio_responsavel_contato is 'Contato livre do escritorio responsavel externo.';
comment on column gkit_jur.processos.acompanhamento_autorizado_em is 'Data/hora em que o acompanhamento consultivo ou externo foi autorizado para monitoramento.';
comment on column gkit_jur.processos.acompanhamento_autorizado_por is 'Usuario que registrou a autorizacao de acompanhamento.';
comment on column gkit_jur.processos.acompanhamento_observacoes is 'Observacoes sobre limites, fonte da autorizacao e combinados de acompanhamento.';
comment on column gkit_jur.processos.incluir_relatorio_mensal is 'Indica se o processo deve aparecer nos relatorios mensais do cliente.';

notify pgrst, 'reload schema';

commit;
