-- GKIT New - Sprint 3
-- Views gerenciais e base de auditoria para dashboard inicial.

create or replace view gkit_new.v_clientes_resumo as
select
  count(*)::integer as clientes,
  count(*) filter (where status = 'prospecto')::integer as prospectos,
  count(*) filter (where status = 'ativo')::integer as ativos
from gkit_new.clientes;

create or replace view gkit_new.v_oportunidades_resumo as
select
  status,
  count(*)::integer as oportunidades,
  coalesce(sum(valor), 0)::numeric(14,2) as valor_total
from gkit_new.oportunidades
group by status;

create or replace view gkit_new.v_produtividade_responsavel as
select
  coalesce(o.responsavel_id, '00000000-0000-0000-0000-000000000000'::uuid) as responsavel_id,
  coalesce(u.nome, u.email, 'Sem responsavel') as responsavel_nome,
  count(o.id)::integer as oportunidades,
  count(o.id) filter (where o.status = 'aprovada')::integer as aprovadas,
  coalesce(sum(o.valor) filter (where o.status = 'aprovada'), 0)::numeric(14,2) as valor_aprovado
from gkit_new.oportunidades o
left join security.usuarios u on u.id = o.responsavel_id
group by coalesce(o.responsavel_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(u.nome, u.email, 'Sem responsavel');

create or replace view gkit_new.v_tarefas_pendentes as
select
  t.id,
  t.oportunidade_id,
  t.cliente_id,
  c.nome as cliente_nome,
  o.descricao as oportunidade_descricao,
  t.descricao,
  t.data_prevista,
  t.responsavel_id,
  coalesce(u.nome, u.email, 'Sem responsavel') as responsavel_nome,
  t.criado_em
from gkit_new.tarefas t
join gkit_new.clientes c on c.id = t.cliente_id
join gkit_new.oportunidades o on o.id = t.oportunidade_id
left join security.usuarios u on u.id = t.responsavel_id
where t.status = 'pendente';

create index if not exists gkit_new_eventos_criado_em_idx
  on gkit_new.eventos (criado_em desc);

create index if not exists gkit_new_eventos_entidade_idx
  on gkit_new.eventos (entidade, entidade_id);
