-- Flex - mapeamento de vendedor Omie e apuracao de comissoes.

create table if not exists flex.receita_mapeamentos (
  id uuid primary key default gen_random_uuid(),
  origem text not null default 'omie',
  vendedor_nome text not null,
  categoria_id uuid references flex.categorias_financeiras(id) on delete set null,
  destino_tipo text not null check (destino_tipo in ('colaborador', 'time')),
  colaborador_id uuid references flex.colaboradores(id) on delete cascade,
  time_id uuid references flex.times(id) on delete cascade,
  prioridade integer not null default 100,
  status text not null default 'ativo',
  observacao text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check (
    (destino_tipo = 'colaborador' and colaborador_id is not null and time_id is null)
    or
    (destino_tipo = 'time' and time_id is not null and colaborador_id is null)
  )
);

create unique index if not exists ux_flex_receita_mapeamentos_omie
  on flex.receita_mapeamentos (
    origem,
    lower(vendedor_nome),
    coalesce(categoria_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

create index if not exists idx_flex_receita_mapeamentos_categoria
  on flex.receita_mapeamentos(categoria_id);

create index if not exists idx_flex_receita_mapeamentos_colaborador
  on flex.receita_mapeamentos(colaborador_id);

create index if not exists idx_flex_receita_mapeamentos_time
  on flex.receita_mapeamentos(time_id);

alter table flex.receita_mapeamentos enable row level security;

insert into flex.receita_mapeamentos (
  origem,
  vendedor_nome,
  categoria_id,
  destino_tipo,
  time_id,
  prioridade,
  status,
  observacao
)
select distinct
  'omie',
  trim(r.metadata ->> 'vendedor_omie'),
  null::uuid,
  'time',
  t.id,
  100,
  'ativo',
  'Mapeado automaticamente por nome identico ao time.'
from flex.receitas r
join flex.times t
  on lower(t.nome) = lower(trim(r.metadata ->> 'vendedor_omie'))
where r.origem = 'omie_financas'
  and nullif(trim(r.metadata ->> 'vendedor_omie'), '') is not null
on conflict do nothing;

update flex.receitas r
set
  time_id = m.time_id,
  colaborador_id = m.colaborador_id,
  atualizado_em = now()
from flex.receita_mapeamentos m
where r.origem = 'omie_financas'
  and m.origem = 'omie'
  and m.status = 'ativo'
  and lower(trim(r.metadata ->> 'vendedor_omie')) = lower(m.vendedor_nome)
  and (m.categoria_id is null or m.categoria_id = r.categoria_id)
  and (r.time_id is null and r.colaborador_id is null);

grant usage on schema flex to authenticated, service_role;
grant select, insert, update, delete on flex.receita_mapeamentos to authenticated, service_role;

comment on table flex.receita_mapeamentos is 'Mapeia vendedor do Omie para colaborador ou time Flex.';
comment on column flex.receita_mapeamentos.categoria_id is 'Categoria opcional para restringir o mapeamento.';
