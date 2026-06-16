-- Flex - rotas automaticas de termo do extrato para categoria de despesa Flex.

create table if not exists flex.despesa_categoria_mapeamentos (
  id uuid primary key default gen_random_uuid(),
  origem text not null default 'ofx',
  termo_origem text not null,
  categoria_id uuid not null references flex.categorias_financeiras(id) on delete restrict,
  macrogrupo text,
  status text not null default 'ativo',
  observacao text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint despesa_categoria_mapeamentos_status_check check (status in ('ativo', 'inativo'))
);

create unique index if not exists ux_flex_despesa_categoria_mapeamentos_origem
  on flex.despesa_categoria_mapeamentos (origem, lower(termo_origem));

create index if not exists idx_flex_despesa_categoria_mapeamentos_categoria
  on flex.despesa_categoria_mapeamentos(categoria_id);

alter table flex.despesa_categoria_mapeamentos enable row level security;

grant select, insert, update, delete on flex.despesa_categoria_mapeamentos to authenticated, service_role;

comment on table flex.despesa_categoria_mapeamentos is 'Mapeia termos de lancamentos OFX para categorias de despesa Flex.';
comment on column flex.despesa_categoria_mapeamentos.termo_origem is 'Termo esperado em fornecedor, nome, memo ou historico do extrato.';
comment on column flex.despesa_categoria_mapeamentos.categoria_id is 'Categoria de despesa Flex aplicada automaticamente nas proximas importacoes.';
