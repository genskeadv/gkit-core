-- Flex - recupera times, categorias de receita e tipos de comissao.

insert into flex.times (nome, descricao, status)
select
  t.nome,
  coalesce(t.descricao, 'Recuperado do cadastro operacional anterior.'),
  case when t.ativo then 'ativo' else 'inativo' end
from gkli_intr.times t
where not exists (
  select 1
  from flex.times ft
  where lower(ft.nome) = lower(t.nome)
);

insert into flex.categorias_financeiras (nome, macrogrupo, tipo, status)
select distinct
  trim(r.metadata ->> 'categoria_omie') as nome,
  'Receitas Omie' as macrogrupo,
  'receita' as tipo,
  'ativo' as status
from flex.receitas r
where r.origem = 'omie_financas'
  and nullif(trim(r.metadata ->> 'categoria_omie'), '') is not null
  and not exists (
    select 1
    from flex.categorias_financeiras c
    where lower(c.nome) = lower(trim(r.metadata ->> 'categoria_omie'))
      and c.macrogrupo = 'Receitas Omie'
  );

update flex.receitas r
set
  categoria_id = c.id,
  atualizado_em = now()
from flex.categorias_financeiras c
where r.origem = 'omie_financas'
  and r.categoria_id is null
  and c.tipo in ('receita', 'ambos')
  and lower(c.nome) = lower(trim(r.metadata ->> 'categoria_omie'));

with origem as (
  select
    tipo.nome,
    tipo.categoria as categoria_legado,
    tipo.percentual,
    case when tipo.comissao_de_time then 'time' else 'individual' end as escopo,
    case when tipo.ativo then 'ativo' else 'inativo' end as status,
    tipo.observacao
  from public.gkli_intr_comissao_tipos_resumo tipo
),
normalizada as (
  select
    origem.nome,
    origem.categoria_legado,
    origem.percentual,
    origem.escopo,
    origem.status,
    origem.observacao,
    c.id as categoria_id
  from origem
  left join flex.categorias_financeiras c
    on lower(c.nome) = lower(origem.nome)
   and c.tipo in ('receita', 'ambos')
)
update flex.tipos_comissao destino
set
  categoria_id = normalizada.categoria_id,
  percentual = normalizada.percentual,
  base_calculo = 'valor_recebido',
  escopo = normalizada.escopo,
  status = normalizada.status,
  observacao = concat_ws(
    ' | ',
    nullif(normalizada.observacao, ''),
    concat('Categoria legado: ', normalizada.categoria_legado)
  ),
  atualizado_em = now()
from normalizada
where lower(destino.nome) = lower(normalizada.nome);

with origem as (
  select
    tipo.nome,
    tipo.categoria as categoria_legado,
    tipo.percentual,
    case when tipo.comissao_de_time then 'time' else 'individual' end as escopo,
    case when tipo.ativo then 'ativo' else 'inativo' end as status,
    tipo.observacao
  from public.gkli_intr_comissao_tipos_resumo tipo
),
normalizada as (
  select
    origem.nome,
    origem.categoria_legado,
    origem.percentual,
    origem.escopo,
    origem.status,
    origem.observacao,
    c.id as categoria_id
  from origem
  left join flex.categorias_financeiras c
    on lower(c.nome) = lower(origem.nome)
   and c.tipo in ('receita', 'ambos')
)
insert into flex.tipos_comissao (
  nome,
  categoria_id,
  percentual,
  base_calculo,
  escopo,
  status,
  observacao
)
select
  normalizada.nome,
  normalizada.categoria_id,
  normalizada.percentual,
  'valor_recebido',
  normalizada.escopo,
  normalizada.status,
  concat_ws(
    ' | ',
    nullif(normalizada.observacao, ''),
    concat('Categoria legado: ', normalizada.categoria_legado)
  )
from normalizada
where not exists (
  select 1
  from flex.tipos_comissao destino
  where lower(destino.nome) = lower(normalizada.nome)
);

grant usage on schema flex to authenticated, service_role;
grant select, insert, update, delete on flex.times to authenticated, service_role;
grant select, insert, update, delete on flex.categorias_financeiras to authenticated, service_role;
grant select, insert, update, delete on flex.tipos_comissao to authenticated, service_role;
