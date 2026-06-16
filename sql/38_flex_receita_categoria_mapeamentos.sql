-- Flex - rotas automaticas de categoria Omie para categoria Flex.

create table if not exists flex.receita_categoria_mapeamentos (
  id uuid primary key default gen_random_uuid(),
  origem text not null default 'omie',
  categoria_origem text not null,
  categoria_id uuid not null references flex.categorias_financeiras(id) on delete restrict,
  status text not null default 'ativo',
  observacao text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint receita_categoria_mapeamentos_status_check check (status in ('ativo', 'inativo'))
);

create unique index if not exists ux_flex_receita_categoria_mapeamentos_origem
  on flex.receita_categoria_mapeamentos (origem, lower(categoria_origem));

create index if not exists idx_flex_receita_categoria_mapeamentos_categoria
  on flex.receita_categoria_mapeamentos(categoria_id);

alter table flex.receita_categoria_mapeamentos enable row level security;

grant select, insert, update, delete on flex.receita_categoria_mapeamentos to authenticated, service_role;

comment on table flex.receita_categoria_mapeamentos is 'Mapeia categorias de origem das receitas Omie para categorias financeiras Flex.';
comment on column flex.receita_categoria_mapeamentos.categoria_origem is 'Categoria ou descricao da receita recebida no arquivo Omie.';
comment on column flex.receita_categoria_mapeamentos.categoria_id is 'Categoria Flex aplicada automaticamente nas proximas importacoes.';

