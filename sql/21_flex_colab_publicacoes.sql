-- Publicacoes estaveis do Flex para consumo futuro pelo Colab.
-- Execute depois de sql/20_flex_bootstrap.sql.

create or replace view public.gkli_flex_colab_comissoes as
select
  c.id,
  c.colaborador_id,
  fc.usuario_id,
  u.nome as colaborador_nome,
  u.email as colaborador_email,
  c.competencia,
  c.valor_base,
  c.percentual,
  c.valor_comissao,
  c.status,
  c.origem,
  tc.nome as tipo_comissao,
  r.cliente,
  c.aprovado_em,
  c.criado_em,
  c.atualizado_em
from flex.comissoes c
join flex.colaboradores fc on fc.id = c.colaborador_id
join security.usuarios u on u.id = fc.usuario_id
left join flex.tipos_comissao tc on tc.id = c.tipo_comissao_id
left join flex.receitas r on r.id = c.receita_id
where c.status in ('aprovada', 'paga');

create or replace view public.gkli_flex_colab_pagamentos as
select
  p.id,
  p.colaborador_id,
  fc.usuario_id,
  u.nome as colaborador_nome,
  u.email as colaborador_email,
  p.competencia,
  p.descricao,
  tp.nome as tipo_pagamento,
  p.data_prevista,
  p.data_pagamento,
  p.valor_bruto,
  p.valor_descontos,
  p.valor_liquido,
  p.status,
  p.origem,
  p.criado_em,
  p.atualizado_em
from flex.pagamentos p
join flex.colaboradores fc on fc.id = p.colaborador_id
join security.usuarios u on u.id = fc.usuario_id
left join flex.tipos_pagamento tp on tp.id = p.tipo_pagamento_id
where p.status in ('previsto', 'em_processamento', 'pago', 'conciliado');

create or replace view public.gkli_flex_colab_resumo as
with pagamentos_agregados as (
  select
    colaborador_id,
    competencia,
    count(*) as pagamentos_total,
    coalesce(sum(valor_liquido), 0) as pagamentos_valor_total
  from flex.pagamentos
  where status in ('previsto', 'em_processamento', 'pago', 'conciliado')
  group by colaborador_id, competencia
),
comissoes_agregadas as (
  select
    colaborador_id,
    competencia,
    count(*) as comissoes_total,
    coalesce(sum(valor_comissao), 0) as comissoes_valor_total
  from flex.comissoes
  where status in ('aprovada', 'paga')
  group by colaborador_id, competencia
),
competencias as (
  select colaborador_id, competencia
  from pagamentos_agregados
  union
  select colaborador_id, competencia
  from comissoes_agregadas
)
select
  fc.id as colaborador_id,
  fc.usuario_id,
  u.nome as colaborador_nome,
  u.email as colaborador_email,
  comp.competencia,
  coalesce(p.pagamentos_total, 0) as pagamentos_total,
  coalesce(p.pagamentos_valor_total, 0) as pagamentos_valor_total,
  coalesce(c.comissoes_total, 0) as comissoes_total,
  coalesce(c.comissoes_valor_total, 0) as comissoes_valor_total
from flex.colaboradores fc
join security.usuarios u on u.id = fc.usuario_id
join competencias comp on comp.colaborador_id = fc.id
left join pagamentos_agregados p on p.colaborador_id = fc.id and p.competencia = comp.competencia
left join comissoes_agregadas c on c.colaborador_id = fc.id and c.competencia = comp.competencia
where fc.status = 'ativo';

grant select on public.gkli_flex_colab_comissoes to authenticated;
grant select on public.gkli_flex_colab_pagamentos to authenticated;
grant select on public.gkli_flex_colab_resumo to authenticated;
