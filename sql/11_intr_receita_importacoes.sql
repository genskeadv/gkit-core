-- GKLI Core - Intr historico de importacoes de receitas
-- Execute depois de 07_intr_receitas_comissoes.sql.

create schema if not exists gkli_intr;
create extension if not exists pgcrypto;

create table if not exists gkli_intr.receita_importacoes (
  id uuid default gen_random_uuid() not null,
  nome_arquivo text not null,
  status text default 'processado' not null,
  total_linhas integer default 0 not null,
  total_receitas integer default 0 not null,
  total_alertas integer default 0 not null,
  valor_base_total numeric(14,2) default 0 not null,
  valor_recebido_total numeric(14,2) default 0 not null,
  observacao text,
  criado_em timestamp with time zone default now() not null,
  constraint receita_importacoes_pkey primary key (id)
);

create index if not exists receita_importacoes_criado_em_idx on gkli_intr.receita_importacoes using btree (criado_em desc);

drop view if exists public.gkli_intr_receita_importacoes_resumo;
create view public.gkli_intr_receita_importacoes_resumo
with (security_invoker = true) as
select
  id,
  nome_arquivo,
  status,
  total_linhas,
  total_receitas,
  total_alertas,
  valor_base_total,
  valor_recebido_total,
  observacao,
  criado_em
from gkli_intr.receita_importacoes
order by criado_em desc;

alter table gkli_intr.receita_importacoes enable row level security;

drop policy if exists intr_service_receita_importacoes on gkli_intr.receita_importacoes;
create policy intr_service_receita_importacoes on gkli_intr.receita_importacoes for all to service_role using (true) with check (true);

drop policy if exists intr_authenticated_read_receita_importacoes on gkli_intr.receita_importacoes;
create policy intr_authenticated_read_receita_importacoes on gkli_intr.receita_importacoes for select to authenticated using (true);

grant usage on schema gkli_intr to authenticated, service_role;
grant select on gkli_intr.receita_importacoes to authenticated, service_role;
grant insert, update, delete on gkli_intr.receita_importacoes to service_role;
grant select on public.gkli_intr_receita_importacoes_resumo to authenticated, service_role;
