-- GKIT Flex - Sprint 5: previsao mensal de despesas e validacao item a item
-- Rodar apos o bootstrap do Flex. Script idempotente.

begin;

create extension if not exists pgcrypto;

alter table flex.extrato_lancamentos
  add column if not exists fornecedor text,
  add column if not exists origem_chave text,
  add column if not exists previsao_despesa_id uuid;

create table if not exists flex.previsoes_despesa (
  id uuid primary key default gen_random_uuid(),
  fornecedor text not null,
  tipo_despesa text not null,
  categoria_id uuid references flex.categorias_financeiras(id) on delete set null,
  macrogrupo text,
  valor_previsto numeric(14,2) not null default 0,
  dia_previsto integer not null default 5 check (dia_previsto between 1 and 31),
  competencia_inicio date not null default date_trunc('month', now())::date,
  competencia_fim date,
  recorrente boolean not null default true,
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  origem text not null default 'manual',
  observacao text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint previsoes_despesa_periodo_check check (competencia_fim is null or competencia_fim >= competencia_inicio)
);

alter table flex.extrato_lancamentos
  drop constraint if exists extrato_lancamentos_previsao_despesa_id_fkey;

alter table flex.extrato_lancamentos
  add constraint extrato_lancamentos_previsao_despesa_id_fkey
  foreign key (previsao_despesa_id) references flex.previsoes_despesa(id) on delete set null;

create table if not exists flex.validacao_itens (
  id uuid primary key default gen_random_uuid(),
  competencia date not null,
  previsao_id uuid references flex.previsoes_despesa(id) on delete set null,
  extrato_lancamento_id uuid references flex.extrato_lancamentos(id) on delete set null,
  tipo text not null check (tipo in ('valor_divergente', 'data_divergente', 'previsto_nao_pago', 'pago_sem_previsao', 'categoria_pendente')),
  fornecedor text,
  descricao text,
  valor_previsto numeric(14,2),
  valor_realizado numeric(14,2),
  data_prevista date,
  data_realizada date,
  diferenca numeric(14,2) generated always as (coalesce(valor_realizado, 0) - coalesce(valor_previsto, 0)) stored,
  status text not null default 'pendente' check (status in ('pendente', 'atualizar_previsao', 'manter_diferenca', 'incluir_previsao', 'ignorado', 'resolvido')),
  decisao text,
  justificativa text,
  tratado_por uuid references security.usuarios(id) on delete set null,
  tratado_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_flex_previsoes_despesa_status on flex.previsoes_despesa(status);
create index if not exists idx_flex_previsoes_despesa_fornecedor on flex.previsoes_despesa(lower(fornecedor));
create index if not exists idx_flex_validacao_itens_competencia on flex.validacao_itens(competencia);
create index if not exists idx_flex_validacao_itens_status on flex.validacao_itens(status);
create index if not exists idx_flex_validacao_itens_previsao on flex.validacao_itens(previsao_id);
create index if not exists idx_flex_lancamentos_origem_chave on flex.extrato_lancamentos(origem_chave);

do $$
declare
  table_name text;
begin
  foreach table_name in array array['previsoes_despesa', 'validacao_itens', 'extrato_lancamentos']
  loop
    execute format('drop trigger if exists set_updated_at on flex.%I', table_name);
    execute format(
      'create trigger set_updated_at before update on flex.%I for each row execute function flex.set_updated_at()',
      table_name
    );
  end loop;
end $$;

alter table flex.previsoes_despesa enable row level security;
alter table flex.validacao_itens enable row level security;

grant usage on schema flex to authenticated, service_role;
grant select, insert, update, delete on flex.previsoes_despesa to authenticated, service_role;
grant select, insert, update, delete on flex.validacao_itens to authenticated, service_role;

-- Base recorrente deve ser cadastrada/importada a partir de fonte validada.
-- O seed de previsoes foi removido para evitar recriar valores historicos incorretos.

commit;
