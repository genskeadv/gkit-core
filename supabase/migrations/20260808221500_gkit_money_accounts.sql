begin;

create table if not exists public.gkit_money_contas (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  conta_principal boolean not null default false,
  ordem integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.contas_pagar_itens
  add column if not exists money_conta_id uuid null references public.gkit_money_contas(id) on delete set null;

alter table public.contas_pagar_itens
  add column if not exists money_conta_destino_id uuid null references public.gkit_money_contas(id) on delete set null;

create unique index if not exists gkit_money_contas_principal_unique
  on public.gkit_money_contas (conta_principal)
  where conta_principal;

create index if not exists idx_gkit_money_contas_status_ordem
  on public.gkit_money_contas (status, ordem, nome);

create index if not exists idx_contas_pagar_itens_money_conta
  on public.contas_pagar_itens (money_conta_id);

create index if not exists idx_contas_pagar_itens_money_destino
  on public.contas_pagar_itens (money_conta_destino_id);

alter table public.gkit_money_contas enable row level security;

grant select, insert, update on public.gkit_money_contas to authenticated;

drop policy if exists "gkit_money_contas_service_role" on public.gkit_money_contas;
create policy "gkit_money_contas_service_role"
  on public.gkit_money_contas
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "authenticated_read_gkit_money_contas" on public.gkit_money_contas;
create policy "authenticated_read_gkit_money_contas"
  on public.gkit_money_contas
  for select
  to authenticated
  using (true);

insert into public.gkit_money_contas (nome, conta_principal, ordem)
values
  ('Genske Advogados', true, 0),
  ('Genske Baia', false, 10),
  ('Lidiane Genske', false, 20)
on conflict (nome) do update set
  conta_principal = excluded.conta_principal,
  ordem = excluded.ordem,
  status = 'ativo',
  updated_at = now();

commit;
