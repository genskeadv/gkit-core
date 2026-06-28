begin;

create table if not exists public.gkit_flex_previsao_receitas (
  id uuid primary key default gen_random_uuid(),
  competencia date not null,
  tipo text not null,
  valor_previsto numeric(14,2) not null default 0,
  origem_competencia date,
  origem_valor numeric(14,2),
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gkit_flex_previsao_receitas_unique unique (competencia, tipo)
);

create table if not exists public.gkit_flex_previsao_pagamentos (
  id uuid primary key default gen_random_uuid(),
  competencia date not null,
  descricao text not null,
  vencimento_dia integer,
  vencimento_texto text,
  valor_previsto numeric(14,2) not null default 0,
  categoria text not null default 'Sem categoria',
  centro text,
  origem_competencia date,
  origem_item_id uuid,
  observacao text,
  ordem integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_gkit_flex_previsao_receitas_competencia
  on public.gkit_flex_previsao_receitas (competencia, tipo);

create index if not exists idx_gkit_flex_previsao_pagamentos_competencia
  on public.gkit_flex_previsao_pagamentos (competencia, ordem, descricao);

alter table public.gkit_flex_previsao_receitas enable row level security;
alter table public.gkit_flex_previsao_pagamentos enable row level security;

grant select, insert, update, delete on public.gkit_flex_previsao_receitas to authenticated;
grant select, insert, update, delete on public.gkit_flex_previsao_pagamentos to authenticated;

drop policy if exists "gkit_flex_previsao_receitas_service_role" on public.gkit_flex_previsao_receitas;
create policy "gkit_flex_previsao_receitas_service_role"
  on public.gkit_flex_previsao_receitas
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "gkit_flex_previsao_pagamentos_service_role" on public.gkit_flex_previsao_pagamentos;
create policy "gkit_flex_previsao_pagamentos_service_role"
  on public.gkit_flex_previsao_pagamentos
  for all
  to service_role
  using (true)
  with check (true);

commit;
