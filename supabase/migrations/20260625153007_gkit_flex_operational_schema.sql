create extension if not exists pgcrypto;

create table if not exists public.comissao_competencias (
  id uuid primary key default gen_random_uuid(),
  competencia date not null unique,
  status text not null default 'aberto' check (status in ('aberto', 'fechado')),
  opened_at timestamptz not null default now(),
  closed_at timestamptz null,
  reopened_at timestamptz null,
  created_at timestamptz not null default now(),
  created_by uuid null references auth.users(id)
);

create table if not exists public.comissao_execucoes (
  id uuid primary key default gen_random_uuid(),
  competencia_id uuid null references public.comissao_competencias(id) on delete set null,
  competencia date not null,
  contas_file_name text not null,
  clientes_file_name text not null,
  status text not null default 'processado',
  total_valor_recebido numeric(14,2) not null default 0,
  total_base_reduzida numeric(14,2) not null default 0,
  total_comissao numeric(14,2) not null default 0,
  audit_count integer not null default 0,
  created_at timestamptz not null default now(),
  created_by uuid null references auth.users(id)
);

alter table public.comissao_execucoes
  add column if not exists competencia_id uuid null references public.comissao_competencias(id) on delete set null;

create table if not exists public.comissao_resumos (
  id uuid primary key default gen_random_uuid(),
  execucao_id uuid not null references public.comissao_execucoes(id) on delete cascade,
  categoria text not null,
  carteira text not null,
  quantidade_lancamentos integer not null default 0,
  valor_recebido numeric(14,2) not null default 0,
  reducao_percentual numeric(8,4) not null default 0,
  valor_reducao numeric(14,2) not null default 0,
  valor_apos_reducao numeric(14,2) not null default 0,
  percentual_comissao numeric(8,4) not null default 0,
  comissao_total numeric(14,2) not null default 0,
  divisor integer not null default 1,
  comissao_final numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.comissao_lancamentos (
  id uuid primary key default gen_random_uuid(),
  execucao_id uuid not null references public.comissao_execucoes(id) on delete cascade,
  linha integer not null,
  cliente text,
  documento text,
  categoria text,
  situacao text,
  valor_recebido numeric(14,2) not null default 0,
  carteira text,
  criterio_match text,
  observacao text,
  raw jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.comissao_auditoria (
  id uuid primary key default gen_random_uuid(),
  execucao_id uuid not null references public.comissao_execucoes(id) on delete cascade,
  linha integer,
  cliente text,
  documento text,
  categoria text,
  valor_recebido numeric(14,2) not null default 0,
  carteira text,
  problema text,
  created_at timestamptz not null default now()
);

create index if not exists idx_comissao_competencias_competencia on public.comissao_competencias (competencia desc);
create index if not exists idx_comissao_competencias_status on public.comissao_competencias (status);
create index if not exists idx_comissao_execucoes_competencia on public.comissao_execucoes (competencia desc);
create index if not exists idx_comissao_execucoes_competencia_id on public.comissao_execucoes (competencia_id);
create index if not exists idx_comissao_resumos_execucao on public.comissao_resumos (execucao_id);
create index if not exists idx_comissao_lancamentos_execucao on public.comissao_lancamentos (execucao_id);
create index if not exists idx_comissao_lancamentos_documento on public.comissao_lancamentos (documento);
create index if not exists idx_comissao_auditoria_execucao on public.comissao_auditoria (execucao_id);

alter table public.comissao_competencias enable row level security;
alter table public.comissao_execucoes enable row level security;
alter table public.comissao_resumos enable row level security;
alter table public.comissao_lancamentos enable row level security;
alter table public.comissao_auditoria enable row level security;

-- O app atual grava pelo servidor usando service_role, que ignora RLS.
-- As policies abaixo deixam pronto para um futuro login com Supabase Auth.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'comissao_competencias' and policyname = 'authenticated_read_comissao_competencias') then
    create policy authenticated_read_comissao_competencias on public.comissao_competencias for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'comissao_execucoes' and policyname = 'authenticated_read_comissao_execucoes') then
    create policy authenticated_read_comissao_execucoes on public.comissao_execucoes for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'comissao_resumos' and policyname = 'authenticated_read_comissao_resumos') then
    create policy authenticated_read_comissao_resumos on public.comissao_resumos for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'comissao_lancamentos' and policyname = 'authenticated_read_comissao_lancamentos') then
    create policy authenticated_read_comissao_lancamentos on public.comissao_lancamentos for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'comissao_auditoria' and policyname = 'authenticated_read_comissao_auditoria') then
    create policy authenticated_read_comissao_auditoria on public.comissao_auditoria for select to authenticated using (true);
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- v13: Cadastros e normalizacao de categorias, centros e carteiras
-- -----------------------------------------------------------------------------
create table if not exists public.gkit_cadastros (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('categoria', 'centro', 'carteira')),
  nome text not null,
  slug text not null,
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  origem text not null default 'manual',
  usos integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid null references auth.users(id),
  unique (tipo, slug)
);

create table if not exists public.gkit_cadastro_aliases (
  id uuid primary key default gen_random_uuid(),
  cadastro_id uuid not null references public.gkit_cadastros(id) on delete cascade,
  tipo text not null check (tipo in ('categoria', 'centro', 'carteira')),
  alias text not null,
  alias_slug text not null,
  origem text not null default 'manual',
  created_at timestamptz not null default now(),
  created_by uuid null references auth.users(id),
  unique (tipo, alias_slug)
);

create table if not exists public.gkit_reclassificacoes (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('categoria', 'centro', 'carteira')),
  origem_cadastro_id uuid null references public.gkit_cadastros(id) on delete set null,
  destino_cadastro_id uuid null references public.gkit_cadastros(id) on delete set null,
  origem_nome text not null,
  destino_nome text not null,
  modo text not null check (modo in ('preview', 'confirmado')),
  motivo text,
  impacto jsonb not null default '{}'::jsonb,
  nomes_afetados text[] not null default '{}'::text[],
  bloqueios text[] not null default '{}'::text[],
  avisos text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  created_by uuid null references auth.users(id)
);

create index if not exists idx_gkit_cadastros_tipo_nome on public.gkit_cadastros(tipo, nome);
create index if not exists idx_gkit_cadastros_tipo_status on public.gkit_cadastros(tipo, status);
create index if not exists idx_gkit_cadastro_aliases_cadastro on public.gkit_cadastro_aliases(cadastro_id);
create index if not exists idx_gkit_cadastro_aliases_tipo_alias on public.gkit_cadastro_aliases(tipo, alias_slug);
create index if not exists idx_gkit_reclassificacoes_tipo on public.gkit_reclassificacoes(tipo, created_at desc);
create index if not exists idx_gkit_reclassificacoes_origem on public.gkit_reclassificacoes(origem_cadastro_id, created_at desc);
create index if not exists idx_gkit_reclassificacoes_destino on public.gkit_reclassificacoes(destino_cadastro_id, created_at desc);

alter table public.gkit_cadastros enable row level security;
alter table public.gkit_cadastro_aliases enable row level security;
alter table public.gkit_reclassificacoes enable row level security;

grant select on public.gkit_cadastros to authenticated;
grant select on public.gkit_cadastro_aliases to authenticated;
grant select on public.gkit_reclassificacoes to authenticated;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'gkit_cadastros' and policyname = 'authenticated_read_gkit_cadastros') then
    create policy authenticated_read_gkit_cadastros on public.gkit_cadastros for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'gkit_cadastro_aliases' and policyname = 'authenticated_read_gkit_cadastro_aliases') then
    create policy authenticated_read_gkit_cadastro_aliases on public.gkit_cadastro_aliases for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'gkit_reclassificacoes' and policyname = 'authenticated_read_gkit_reclassificacoes') then
    create policy authenticated_read_gkit_reclassificacoes on public.gkit_reclassificacoes for select to authenticated using (true);
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Contas a pagar mensal
-- -----------------------------------------------------------------------------
create table if not exists public.contas_pagar_competencias (
  id uuid primary key default gen_random_uuid(),
  competencia date not null unique,
  status text not null default 'aberto' check (status in ('aberto', 'fechado')),
  origem_competencia_id uuid references public.contas_pagar_competencias(id),
  opened_at timestamptz default now(),
  closed_at timestamptz,
  reopened_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contas_pagar_itens (
  id uuid primary key default gen_random_uuid(),
  competencia_id uuid not null references public.contas_pagar_competencias(id) on delete cascade,
  competencia date not null,
  descricao text not null,
  vencimento_dia integer check (vencimento_dia is null or (vencimento_dia between 1 and 31)),
  vencimento_texto text,
  valor_previsto numeric(14,2) not null default 0,
  categoria text not null default 'Sem categoria',
  centro text,
  pago boolean not null default false,
  origem_arquivo text,
  origem_item_id uuid references public.contas_pagar_itens(id),
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_contas_pagar_itens_competencia_id on public.contas_pagar_itens(competencia_id);
create index if not exists idx_contas_pagar_itens_competencia on public.contas_pagar_itens(competencia);
create index if not exists idx_contas_pagar_itens_categoria on public.contas_pagar_itens(categoria);
create index if not exists idx_contas_pagar_itens_pago on public.contas_pagar_itens(pago);

-- -----------------------------------------------------------------------------
-- v6: integração automática das comissões no contas a pagar
-- -----------------------------------------------------------------------------
alter table public.contas_pagar_itens
  add column if not exists origem_tipo text not null default 'importacao';

alter table public.contas_pagar_itens
  add column if not exists origem_execucao_id uuid null references public.comissao_execucoes(id) on delete set null;

alter table public.contas_pagar_itens
  add column if not exists origem_resumo_id uuid null references public.comissao_resumos(id) on delete set null;

create index if not exists idx_contas_pagar_itens_origem_tipo on public.contas_pagar_itens(origem_tipo);
create index if not exists idx_contas_pagar_itens_origem_execucao on public.contas_pagar_itens(origem_execucao_id);
create index if not exists idx_contas_pagar_itens_origem_resumo on public.contas_pagar_itens(origem_resumo_id);

-- -----------------------------------------------------------------------------
-- v10: robustez operacional, auditoria, snapshots e prévia de importação
-- -----------------------------------------------------------------------------
create table if not exists public.gkit_eventos (
  id uuid primary key default gen_random_uuid(),
  modulo text not null,
  competencia date,
  action text not null,
  entidade_tipo text,
  entidade_id uuid,
  detalhe jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid null references auth.users(id)
);

create table if not exists public.contas_pagar_snapshots (
  id uuid primary key default gen_random_uuid(),
  competencia_id uuid references public.contas_pagar_competencias(id) on delete set null,
  competencia date,
  motivo text not null,
  total_itens integer not null default 0,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid null references auth.users(id)
);

create table if not exists public.contas_pagar_importacoes (
  id uuid primary key default gen_random_uuid(),
  competencia_id uuid references public.contas_pagar_competencias(id) on delete set null,
  competencia date not null,
  arquivo_nome text not null,
  modo text not null check (modo in ('preview', 'confirmado')),
  snapshot_id uuid null references public.contas_pagar_snapshots(id) on delete set null,
  linhas_lidas integer not null default 0,
  linhas_validas integer not null default 0,
  linhas_com_erro integer not null default 0,
  itens_novos integer not null default 0,
  itens_alterados integer not null default 0,
  itens_removidos integer not null default 0,
  valor_atual_manual numeric(14,2) not null default 0,
  valor_importado_manual numeric(14,2) not null default 0,
  issues jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid null references auth.users(id)
);

create index if not exists idx_gkit_eventos_competencia on public.gkit_eventos(competencia desc, created_at desc);
create index if not exists idx_gkit_eventos_modulo on public.gkit_eventos(modulo, created_at desc);
create index if not exists idx_contas_pagar_snapshots_competencia on public.contas_pagar_snapshots(competencia_id, created_at desc);
create index if not exists idx_contas_pagar_importacoes_competencia on public.contas_pagar_importacoes(competencia_id, created_at desc);

alter table public.gkit_eventos enable row level security;
alter table public.contas_pagar_snapshots enable row level security;
alter table public.contas_pagar_importacoes enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'gkit_eventos' and policyname = 'authenticated_read_gkit_eventos') then
    create policy authenticated_read_gkit_eventos on public.gkit_eventos for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'contas_pagar_snapshots' and policyname = 'authenticated_read_contas_pagar_snapshots') then
    create policy authenticated_read_contas_pagar_snapshots on public.contas_pagar_snapshots for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'contas_pagar_importacoes' and policyname = 'authenticated_read_contas_pagar_importacoes') then
    create policy authenticated_read_contas_pagar_importacoes on public.contas_pagar_importacoes for select to authenticated using (true);
  end if;
end $$;
