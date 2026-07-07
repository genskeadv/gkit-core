create or replace function gkit_jur.proximos_processos_sync(
  p_limit integer default 25,
  p_tribunal text default null,
  p_processo_id uuid default null
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
      p.ultima_sincronizacao_em,
      p.updated_at,
      coalesce(f.transient_failures, 0) as transient_failures
    from gkit_jur.processos p
    left join gkit_jur.processos_resumos r on r.processo_id = p.id
    left join lateral (
      select count(*)::integer as transient_failures
      from gkit_jur.sincronizacoes s
      where s.processo_id = p.id
        and s.started_at >= now() - interval '12 hours'
        and s.status in ('timeout', 'erro')
        and coalesce(s.erro_codigo, '') in (
          'DATAJUD_TRANSIENT_ERROR',
          'HTTP_408',
          'HTTP_409',
          'HTTP_425',
          'HTTP_429',
          'HTTP_500',
          'HTTP_502',
          'HTTP_503',
          'HTTP_504'
        )
    ) f on true
    where p.status = 'ativo'
      and p.tribunal_alias is not null
      and (p_processo_id is null or p.id = p_processo_id)
      and (p_processo_id is not null or p.status_monitoramento = 'monitorando')
      and (p_tribunal is null or p.tribunal_sigla = p_tribunal)
  ),
  ranked as (
    select
      base.*,
      row_number() over (
        partition by base.transient_failures, base.prontidao_rank, base.tribunal_alias
        order by base.ultima_sincronizacao_em asc nulls first, base.updated_at asc nulls first
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
    case when p_processo_id is not null then 0 else ranked.transient_failures end,
    ranked.prontidao_rank,
    ranked.tribunal_round,
    ranked.ultima_sincronizacao_em asc nulls first,
    ranked.updated_at asc nulls first
  limit greatest(1, least(coalesce(p_limit, 25), 25));
$function$;
