begin;

create table if not exists public.colab_uber_fechamentos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  competencia date not null,
  periodo_inicio date not null,
  periodo_fim date not null,
  cliente_id uuid not null references ciclo.clientes(id) on delete restrict,
  cliente_nome_snapshot text not null,
  quantidade_corridas integer not null default 0 check (quantidade_corridas >= 0),
  valor_total numeric(14,2) not null default 0 check (valor_total >= 0),
  status text not null default 'gerado' check (status in ('gerado', 'cancelado')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.colab_uber_despesas
  add column if not exists uber_fechamento_id uuid references public.colab_uber_fechamentos(id) on delete set null;

create index if not exists idx_colab_uber_fechamentos_periodo
  on public.colab_uber_fechamentos(periodo_inicio, periodo_fim, cliente_id);

create index if not exists idx_colab_uber_fechamentos_competencia
  on public.colab_uber_fechamentos(competencia, created_at desc);

create index if not exists idx_colab_uber_despesas_fechamento
  on public.colab_uber_despesas(uber_fechamento_id);

create index if not exists idx_colab_uber_despesas_reembolso_sem_fechamento
  on public.colab_uber_despesas(data_despesa, cliente_id)
  where uber_fechamento_id is null
    and status in ('conciliado', 'reembolso_solicitado');

alter table public.colab_uber_fechamentos enable row level security;

grant select, insert, update, delete on public.colab_uber_fechamentos to service_role;
grant select on public.colab_uber_fechamentos to authenticated;

drop policy if exists colab_uber_fechamentos_read_fat on public.colab_uber_fechamentos;
create policy colab_uber_fechamentos_read_fat
  on public.colab_uber_fechamentos
  for select
  to authenticated
  using (
    security.usuario_tem_permissao('gkit_fat.uber.read')
    or security.usuario_tem_permissao('gkit_fat.uber.write')
    or security.usuario_tem_permissao('gkit_flex.uber.read')
    or security.usuario_tem_permissao('gkit_flex.uber.write')
  );

drop policy if exists colab_uber_fechamentos_write_fat on public.colab_uber_fechamentos;
create policy colab_uber_fechamentos_write_fat
  on public.colab_uber_fechamentos
  for all
  to authenticated
  using (
    security.usuario_tem_permissao('gkit_fat.uber.write')
    or security.usuario_tem_permissao('gkit_flex.uber.write')
  )
  with check (
    security.usuario_tem_permissao('gkit_fat.uber.write')
    or security.usuario_tem_permissao('gkit_flex.uber.write')
  );

commit;
