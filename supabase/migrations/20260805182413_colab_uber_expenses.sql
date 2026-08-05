begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'colab-uber-recibos',
  'colab-uber-recibos',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.colab_uber_despesas (
  id uuid primary key default gen_random_uuid(),
  colaborador_usuario_id uuid not null references security.usuarios(id) on delete restrict,
  colaborador_flex_id uuid references public.gkit_flex_colaboradores(id) on delete set null,
  cliente_id uuid not null references ciclo.clientes(id) on delete restrict,
  cliente_nome_snapshot text not null,
  data_despesa date not null default current_date,
  competencia date not null,
  descricao text not null,
  valor numeric(14,2) not null check (valor > 0),
  recibo_bucket text not null default 'colab-uber-recibos',
  recibo_path text not null,
  recibo_nome text not null,
  recibo_tipo text,
  recibo_tamanho bigint,
  status text not null default 'lancado' check (status in ('lancado', 'em_conferencia', 'conciliado', 'reembolso_solicitado', 'reembolsado', 'rejeitado')),
  observacao text,
  uber_relatorio_corrida_id uuid,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.colab_uber_relatorios (
  id uuid primary key default gen_random_uuid(),
  competencia date not null,
  arquivo_nome text not null,
  linhas_lidas integer not null default 0,
  corridas_identificadas integer not null default 0,
  corridas_sem_lancamento integer not null default 0,
  valor_total numeric(14,2) not null default 0,
  valor_sem_lancamento numeric(14,2) not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.colab_uber_relatorio_corridas (
  id uuid primary key default gen_random_uuid(),
  relatorio_id uuid not null references public.colab_uber_relatorios(id) on delete cascade,
  competencia date not null,
  linha integer not null,
  creation_date timestamptz,
  voucher_link text,
  guest_name text,
  guest_email text,
  guest_phone text,
  voucher_status text,
  amount_spent numeric(14,2) not null default 0,
  orders_trips integer not null default 0,
  matched_despesa_id uuid references public.colab_uber_despesas(id) on delete set null,
  status_conciliacao text not null default 'sem_lancamento' check (status_conciliacao in ('sem_corrida', 'sem_lancamento', 'conciliado')),
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (relatorio_id, linha)
);

alter table public.colab_uber_despesas
  add constraint colab_uber_despesas_relatorio_fk
  foreign key (uber_relatorio_corrida_id)
  references public.colab_uber_relatorio_corridas(id)
  on delete set null
  not valid;

create index if not exists idx_colab_uber_despesas_colaborador
  on public.colab_uber_despesas(colaborador_usuario_id, created_at desc);

create index if not exists idx_colab_uber_despesas_cliente
  on public.colab_uber_despesas(cliente_id, created_at desc);

create index if not exists idx_colab_uber_despesas_competencia
  on public.colab_uber_despesas(competencia, status);

create index if not exists idx_colab_uber_despesas_valor
  on public.colab_uber_despesas(valor);

create index if not exists idx_colab_uber_relatorios_competencia
  on public.colab_uber_relatorios(competencia, created_at desc);

create index if not exists idx_colab_uber_relatorio_corridas_lookup
  on public.colab_uber_relatorio_corridas(competencia, lower(guest_email), amount_spent);

alter table public.colab_uber_despesas enable row level security;
alter table public.colab_uber_relatorios enable row level security;
alter table public.colab_uber_relatorio_corridas enable row level security;

grant select, insert, update, delete on public.colab_uber_despesas to service_role;
grant select, insert, update, delete on public.colab_uber_relatorios to service_role;
grant select, insert, update, delete on public.colab_uber_relatorio_corridas to service_role;

grant select, insert on public.colab_uber_despesas to authenticated;
grant select on public.colab_uber_relatorios to authenticated;
grant select on public.colab_uber_relatorio_corridas to authenticated;

drop policy if exists colab_uber_despesas_read_scope on public.colab_uber_despesas;
create policy colab_uber_despesas_read_scope
  on public.colab_uber_despesas
  for select
  to authenticated
  using (
    colaborador_usuario_id = (select auth.uid())
    or security.usuario_tem_permissao('gkit_flex.uber.read')
    or security.usuario_tem_permissao('gkit_flex.uber.write')
  );

drop policy if exists colab_uber_despesas_insert_own on public.colab_uber_despesas;
create policy colab_uber_despesas_insert_own
  on public.colab_uber_despesas
  for insert
  to authenticated
  with check (
    colaborador_usuario_id = (select auth.uid())
    and security.usuario_tem_permissao('colab.uber.write')
  );

drop policy if exists colab_uber_despesas_update_flex on public.colab_uber_despesas;
create policy colab_uber_despesas_update_flex
  on public.colab_uber_despesas
  for update
  to authenticated
  using (security.usuario_tem_permissao('gkit_flex.uber.write'))
  with check (security.usuario_tem_permissao('gkit_flex.uber.write'));

drop policy if exists colab_uber_relatorios_read_flex on public.colab_uber_relatorios;
create policy colab_uber_relatorios_read_flex
  on public.colab_uber_relatorios
  for select
  to authenticated
  using (
    security.usuario_tem_permissao('gkit_flex.uber.read')
    or security.usuario_tem_permissao('gkit_flex.uber.write')
  );

drop policy if exists colab_uber_relatorio_corridas_read_flex on public.colab_uber_relatorio_corridas;
create policy colab_uber_relatorio_corridas_read_flex
  on public.colab_uber_relatorio_corridas
  for select
  to authenticated
  using (
    security.usuario_tem_permissao('gkit_flex.uber.read')
    or security.usuario_tem_permissao('gkit_flex.uber.write')
  );

drop policy if exists colab_uber_recibos_own_select on storage.objects;
create policy colab_uber_recibos_own_select
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'colab-uber-recibos'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or security.usuario_tem_permissao('gkit_flex.uber.read')
      or security.usuario_tem_permissao('gkit_flex.uber.write')
    )
  );

drop policy if exists colab_uber_recibos_own_insert on storage.objects;
create policy colab_uber_recibos_own_insert
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'colab-uber-recibos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and security.usuario_tem_permissao('colab.uber.write')
  );

with rows(codigo, nome, descricao, app_codigo, recurso, acao, sistema, status) as (
  values
    ('colab.uber.read', 'Colab - ler despesas Uber', 'Consultar despesas de Uber do colaborador.', 'colab', 'colab.uber', 'read', true, 'ativo'),
    ('colab.uber.write', 'Colab - lançar despesas Uber', 'Lançar despesas de Uber com recibo para reembolso.', 'colab', 'colab.uber', 'write', true, 'ativo'),
    ('gkit_flex.uber.read', 'GKIT Flex - ler conciliação Uber', 'Consultar despesas e relatórios Uber importados.', 'gkit_flex', 'gkit_flex.uber', 'read', true, 'ativo'),
    ('gkit_flex.uber.write', 'GKIT Flex - conciliar Uber', 'Importar relatório Uber e atualizar conciliações.', 'gkit_flex', 'gkit_flex.uber', 'write', true, 'ativo')
)
insert into security.permissoes (codigo, nome, descricao, app_id, recurso, acao, sistema, status)
select rows.codigo, rows.nome, rows.descricao, apps.id, rows.recurso, rows.acao, rows.sistema, rows.status::core.status_registro
from rows
left join core.apps apps on apps.codigo in (rows.app_codigo, replace(rows.app_codigo, '_', '-'))
on conflict (codigo) do update
set
  nome = excluded.nome,
  descricao = excluded.descricao,
  app_id = excluded.app_id,
  recurso = excluded.recurso,
  acao = excluded.acao,
  sistema = excluded.sistema,
  status = excluded.status;

commit;
