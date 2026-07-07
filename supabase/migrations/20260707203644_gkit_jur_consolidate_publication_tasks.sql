-- Consolidate noisy open publication tasks generated from historical DataJud/AASP movements.
-- The operational model is one open publication-analysis task per process/rule; the kept
-- task carries all movement hashes in payload, while superseded tasks are cancelled.

with ranked_publication_tasks as (
  select
    t.*,
    first_value(t.id) over (
      partition by t.processo_id, coalesce(t.payload ->> 'regra_id', '')
      order by coalesce(t.prazo_at, t.created_at) desc, t.created_at desc, t.id desc
    ) as keeper_id,
    row_number() over (
      partition by t.processo_id, coalesce(t.payload ->> 'regra_id', '')
      order by coalesce(t.prazo_at, t.created_at) desc, t.created_at desc, t.id desc
    ) as task_rank
  from gkit_jur.tarefas t
  where t.status in ('aberta', 'em_andamento', 'aguardando_terceiro')
    and t.tipo = 'publicacao'
    and t.origem in ('integracao_movimentacao', 'datajud_movimentacao', 'aasp_movimentacao')
),
task_groups as (
  select
    keeper_id,
    count(*)::integer as total_tasks,
    count(*) filter (where task_rank > 1)::integer as duplicate_tasks
  from ranked_publication_tasks
  group by keeper_id
  having count(*) > 1
),
movement_hashes as (
  select
    ranked.keeper_id,
    to_jsonb(array_agg(distinct hash_item.hash_value order by hash_item.hash_value)) as hashes
  from ranked_publication_tasks ranked
  join task_groups grouped on grouped.keeper_id = ranked.keeper_id
  cross join lateral jsonb_array_elements_text(coalesce(ranked.payload -> 'movimentacao_hashes', '[]'::jsonb)) as hash_item(hash_value)
  group by ranked.keeper_id
),
movement_items as (
  select
    ranked.keeper_id,
    jsonb_agg(distinct movement_item.movement_value) as movements,
    min(movement_item.movement_value ->> 'data_hora') as first_movement_at,
    max(movement_item.movement_value ->> 'data_hora') as last_movement_at,
    count(distinct movement_item.movement_value)::integer as movement_count
  from ranked_publication_tasks ranked
  join task_groups grouped on grouped.keeper_id = ranked.keeper_id
  cross join lateral jsonb_array_elements(coalesce(ranked.payload -> 'movimentacoes', '[]'::jsonb)) as movement_item(movement_value)
  group by ranked.keeper_id
)
update gkit_jur.tarefas keeper
set
  descricao = concat(
    'Publicacoes/intimacoes consolidadas para analise operacional.',
    E'\n\nMovimentacoes consolidadas: ',
    coalesce(movement_items.movement_count, 0)::text,
    case
      when movement_items.first_movement_at is null then ''
      when movement_items.first_movement_at = movement_items.last_movement_at then concat(' em ', movement_items.first_movement_at)
      else concat(' entre ', movement_items.first_movement_at, ' e ', movement_items.last_movement_at)
    end,
    E'\n\nAs tarefas repetidas foram canceladas automaticamente e seus hashes permaneceram neste payload.'
  ),
  origem = 'integracao_movimentacao',
  payload = coalesce(keeper.payload, '{}'::jsonb)
    || jsonb_build_object(
      'data_movimentacao', 'publicacoes-abertas',
      'estrategia_agrupamento', 'tarefa_aberta_por_processo_regra',
      'movimentacao_hashes', coalesce(movement_hashes.hashes, '[]'::jsonb),
      'movimentacoes', coalesce(movement_items.movements, '[]'::jsonb),
      'tarefas_consolidadas', task_groups.total_tasks,
      'tarefas_canceladas_por_consolidacao', task_groups.duplicate_tasks,
      'consolidado_em', now()
    ),
  updated_at = now()
from task_groups
left join movement_hashes on movement_hashes.keeper_id = task_groups.keeper_id
left join movement_items on movement_items.keeper_id = task_groups.keeper_id
where keeper.id = task_groups.keeper_id;

with ranked_publication_tasks as (
  select
    t.id,
    first_value(t.id) over (
      partition by t.processo_id, coalesce(t.payload ->> 'regra_id', '')
      order by coalesce(t.prazo_at, t.created_at) desc, t.created_at desc, t.id desc
    ) as keeper_id,
    row_number() over (
      partition by t.processo_id, coalesce(t.payload ->> 'regra_id', '')
      order by coalesce(t.prazo_at, t.created_at) desc, t.created_at desc, t.id desc
    ) as task_rank
  from gkit_jur.tarefas t
  where t.status in ('aberta', 'em_andamento', 'aguardando_terceiro')
    and t.tipo = 'publicacao'
    and t.origem in ('integracao_movimentacao', 'datajud_movimentacao', 'aasp_movimentacao')
)
update gkit_jur.tarefas duplicate
set
  status = 'cancelada',
  payload = coalesce(duplicate.payload, '{}'::jsonb)
    || jsonb_build_object(
      'consolidada_em_tarefa_id', ranked_publication_tasks.keeper_id,
      'cancelada_por_consolidacao_em', now()
    ),
  updated_at = now()
from ranked_publication_tasks
where duplicate.id = ranked_publication_tasks.id
  and ranked_publication_tasks.task_rank > 1;
