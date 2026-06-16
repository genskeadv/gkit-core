-- GKLI Flex - bootstrap inicial
-- Objetivo: criar um schema novo e independente para o modulo Flex.
-- Este script e idempotente na medida do possivel, mas deve ser revisado antes
-- de rodar em producao.

begin;

create schema if not exists flex;

create extension if not exists pgcrypto;

create or replace function flex.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

create table if not exists flex.times (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  status text not null default 'ativo',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (nome)
);

create table if not exists flex.colaboradores (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references security.usuarios(id) on delete restrict,
  carteira_id uuid references core.carteiras(id) on delete set null,
  time_id uuid references flex.times(id) on delete set null,
  gestor_usuario_id uuid references security.usuarios(id) on delete set null,
  cargo_operacional text,
  status text not null default 'ativo',
  salario numeric(14,2) not null default 0,
  pro_labore numeric(14,2) not null default 0,
  ajuda_custo numeric(14,2) not null default 0,
  outros_vencimentos numeric(14,2) not null default 0,
  beneficio_descricao text,
  beneficio_valor numeric(14,2) not null default 0,
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (usuario_id)
);

create table if not exists flex.time_membros (
  id uuid primary key default gen_random_uuid(),
  time_id uuid not null references flex.times(id) on delete cascade,
  colaborador_id uuid not null references flex.colaboradores(id) on delete cascade,
  papel text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (time_id, colaborador_id)
);

create table if not exists flex.categorias_financeiras (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  macrogrupo text not null,
  tipo text not null check (tipo in ('receita', 'despesa', 'ambos')),
  status text not null default 'ativo',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (nome, macrogrupo)
);

create table if not exists flex.regras_classificacao (
  id uuid primary key default gen_random_uuid(),
  termo text not null,
  categoria_id uuid references flex.categorias_financeiras(id) on delete set null,
  macrogrupo text,
  tipo_lancamento text check (tipo_lancamento in ('entrada', 'saida', 'ambos')),
  prioridade integer not null default 100,
  confianca numeric(5,2) not null default 80,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists flex.importacoes (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('receitas', 'extrato', 'recibos', 'outro')),
  origem text,
  arquivo_nome text,
  arquivo_hash text,
  status text not null default 'processado',
  total_itens integer not null default 0,
  total_processados integer not null default 0,
  total_erros integer not null default 0,
  total_alertas integer not null default 0,
  usuario_id uuid references security.usuarios(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists flex.importacao_itens (
  id uuid primary key default gen_random_uuid(),
  importacao_id uuid not null references flex.importacoes(id) on delete cascade,
  linha integer,
  status text not null default 'processado',
  chave_origem text,
  mensagem text,
  payload jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);

create table if not exists flex.receitas (
  id uuid primary key default gen_random_uuid(),
  importacao_id uuid references flex.importacoes(id) on delete set null,
  colaborador_id uuid references flex.colaboradores(id) on delete set null,
  time_id uuid references flex.times(id) on delete set null,
  categoria_id uuid references flex.categorias_financeiras(id) on delete set null,
  cliente text not null,
  descricao text,
  competencia date not null,
  data_recebimento date,
  valor_base numeric(14,2) not null default 0,
  valor_recebido numeric(14,2) not null default 0,
  status text not null default 'realizada',
  origem text,
  origem_chave text,
  metadata jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists flex.extratos (
  id uuid primary key default gen_random_uuid(),
  importacao_id uuid references flex.importacoes(id) on delete set null,
  banco text,
  conta text,
  periodo_inicio date,
  periodo_fim date,
  saldo_inicial numeric(14,2),
  saldo_final numeric(14,2),
  status text not null default 'processado',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists flex.extrato_lancamentos (
  id uuid primary key default gen_random_uuid(),
  extrato_id uuid not null references flex.extratos(id) on delete cascade,
  categoria_id uuid references flex.categorias_financeiras(id) on delete set null,
  data_lancamento date not null,
  historico text,
  descricao text,
  valor numeric(14,2) not null,
  tipo text not null check (tipo in ('entrada', 'saida')),
  macrogrupo text,
  status_classificacao text not null default 'pendente',
  confianca numeric(5,2),
  conciliado boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists flex.despesas_recorrentes (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid references flex.categorias_financeiras(id) on delete set null,
  descricao text not null,
  macrogrupo text,
  valor_medio numeric(14,2) not null default 0,
  dia_previsto integer,
  frequencia text not null default 'mensal',
  status text not null default 'ativo',
  ultima_competencia date,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists flex.orcamentos (
  id uuid primary key default gen_random_uuid(),
  competencia date not null,
  categoria_id uuid references flex.categorias_financeiras(id) on delete set null,
  macrogrupo text,
  valor_previsto numeric(14,2) not null default 0,
  origem text not null default 'recorrencia',
  status text not null default 'publicado',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists flex.validacoes (
  id uuid primary key default gen_random_uuid(),
  competencia date not null,
  categoria_id uuid references flex.categorias_financeiras(id) on delete set null,
  valor_previsto numeric(14,2) not null default 0,
  valor_realizado numeric(14,2) not null default 0,
  diferenca numeric(14,2) generated always as (valor_realizado - valor_previsto) stored,
  status text not null default 'pendente',
  tratamento text,
  tratado_por uuid references security.usuarios(id) on delete set null,
  tratado_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists flex.sugestoes (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  competencia date,
  referencia_id uuid,
  titulo text not null,
  descricao text,
  status text not null default 'pendente',
  payload jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists flex.tipos_comissao (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  categoria_id uuid references flex.categorias_financeiras(id) on delete set null,
  percentual numeric(7,4) not null default 0,
  base_calculo text not null default 'valor_recebido',
  escopo text not null default 'individual' check (escopo in ('individual', 'time')),
  inicio_vigencia date,
  fim_vigencia date,
  status text not null default 'ativo',
  observacao text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists flex.comissoes (
  id uuid primary key default gen_random_uuid(),
  receita_id uuid references flex.receitas(id) on delete set null,
  colaborador_id uuid references flex.colaboradores(id) on delete restrict,
  tipo_comissao_id uuid references flex.tipos_comissao(id) on delete set null,
  fechamento_id uuid,
  competencia date not null,
  valor_base numeric(14,2) not null default 0,
  percentual numeric(7,4) not null default 0,
  valor_comissao numeric(14,2) not null default 0,
  status text not null default 'calculada',
  origem text,
  observacao text,
  aprovado_por uuid references security.usuarios(id) on delete set null,
  aprovado_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists flex.tipos_pagamento (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nome text not null,
  status text not null default 'ativo',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists flex.pagamento_agendas (
  id uuid primary key default gen_random_uuid(),
  tipo_pagamento_id uuid references flex.tipos_pagamento(id) on delete set null,
  colaborador_id uuid references flex.colaboradores(id) on delete cascade,
  time_id uuid references flex.times(id) on delete set null,
  descricao text,
  dia_previsto integer,
  valor_bruto numeric(14,2) not null default 0,
  valor_descontos numeric(14,2) not null default 0,
  percentual numeric(7,4) not null default 0,
  inicio_competencia date not null,
  fim_competencia date,
  status text not null default 'ativo',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists flex.pagamentos (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references flex.colaboradores(id) on delete restrict,
  tipo_pagamento_id uuid references flex.tipos_pagamento(id) on delete set null,
  agenda_id uuid references flex.pagamento_agendas(id) on delete set null,
  comissao_id uuid references flex.comissoes(id) on delete set null,
  fechamento_id uuid,
  competencia date not null,
  descricao text,
  data_prevista date,
  data_pagamento date,
  valor_bruto numeric(14,2) not null default 0,
  valor_descontos numeric(14,2) not null default 0,
  valor_liquido numeric(14,2) generated always as (valor_bruto - valor_descontos) stored,
  status text not null default 'previsto',
  origem text,
  observacao text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists flex.conciliacoes (
  id uuid primary key default gen_random_uuid(),
  pagamento_id uuid references flex.pagamentos(id) on delete cascade,
  extrato_lancamento_id uuid references flex.extrato_lancamentos(id) on delete cascade,
  status text not null default 'conciliado',
  confianca numeric(5,2),
  observacao text,
  conciliado_por uuid references security.usuarios(id) on delete set null,
  conciliado_em timestamptz not null default now(),
  unique (pagamento_id, extrato_lancamento_id)
);

create table if not exists flex.fechamentos (
  id uuid primary key default gen_random_uuid(),
  competencia date not null unique,
  status text not null default 'aberto',
  receita_total numeric(14,2) not null default 0,
  despesa_total numeric(14,2) not null default 0,
  orcamento_total numeric(14,2) not null default 0,
  comissao_total numeric(14,2) not null default 0,
  pagamentos_previstos_total numeric(14,2) not null default 0,
  pagamentos_pagos_total numeric(14,2) not null default 0,
  saldo_operacional numeric(14,2) not null default 0,
  pendencias_total integer not null default 0,
  fechado_por uuid references security.usuarios(id) on delete set null,
  fechado_em timestamptz,
  reabertura_motivo text,
  metadata jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table flex.comissoes
  drop constraint if exists comissoes_fechamento_id_fkey;

alter table flex.comissoes
  add constraint comissoes_fechamento_id_fkey
  foreign key (fechamento_id) references flex.fechamentos(id) on delete set null;

alter table flex.pagamentos
  drop constraint if exists pagamentos_fechamento_id_fkey;

alter table flex.pagamentos
  add constraint pagamentos_fechamento_id_fkey
  foreign key (fechamento_id) references flex.fechamentos(id) on delete set null;

create table if not exists flex.fechamento_checklist (
  id uuid primary key default gen_random_uuid(),
  fechamento_id uuid not null references flex.fechamentos(id) on delete cascade,
  chave text not null,
  titulo text not null,
  status text not null default 'pendente',
  total integer not null default 0,
  pendencias integer not null default 0,
  detalhe text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (fechamento_id, chave)
);

create table if not exists flex.eventos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references security.usuarios(id) on delete set null,
  entidade text not null,
  entidade_id uuid,
  acao text not null,
  detalhe text,
  metadata jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);

create index if not exists idx_flex_colaboradores_usuario on flex.colaboradores(usuario_id);
create index if not exists idx_flex_receitas_competencia on flex.receitas(competencia);
create index if not exists idx_flex_lancamentos_extrato on flex.extrato_lancamentos(extrato_id);
create index if not exists idx_flex_lancamentos_classificacao on flex.extrato_lancamentos(status_classificacao);
create index if not exists idx_flex_comissoes_competencia on flex.comissoes(competencia);
create index if not exists idx_flex_comissoes_status on flex.comissoes(status);
create index if not exists idx_flex_pagamentos_competencia on flex.pagamentos(competencia);
create index if not exists idx_flex_pagamentos_status on flex.pagamentos(status);
create index if not exists idx_flex_validacoes_competencia on flex.validacoes(competencia);
create index if not exists idx_flex_sugestoes_status on flex.sugestoes(status);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'times',
    'colaboradores',
    'categorias_financeiras',
    'regras_classificacao',
    'importacoes',
    'receitas',
    'extratos',
    'extrato_lancamentos',
    'despesas_recorrentes',
    'orcamentos',
    'validacoes',
    'sugestoes',
    'tipos_comissao',
    'comissoes',
    'tipos_pagamento',
    'pagamento_agendas',
    'pagamentos',
    'fechamentos',
    'fechamento_checklist'
  ]
  loop
    execute format('drop trigger if exists set_updated_at on flex.%I', table_name);
    execute format(
      'create trigger set_updated_at before update on flex.%I for each row execute function flex.set_updated_at()',
      table_name
    );
  end loop;
end $$;

insert into core.apps (codigo, nome, descricao, status, url_path, ordem)
values (
  'flex',
  'GKLI Flex',
  'Modulo financeiro-operacional interno da GKIT Suite.',
  'ativo',
  '/modulos/flex',
  40
)
on conflict (codigo) do update
set
  nome = excluded.nome,
  descricao = excluded.descricao,
  status = excluded.status,
  url_path = excluded.url_path,
  ordem = excluded.ordem;

with rows(codigo, nome, descricao, recurso, acao, sistema, status) as (
  values
    ('flex.dashboard.read', 'Flex - dashboard', 'Acessar cockpit e dashboard do Flex.', 'flex.dashboard', 'read', true, 'ativo'),
    ('flex.importacoes.read', 'Flex - ler importacoes', 'Consultar importacoes do Flex.', 'flex.importacoes', 'read', true, 'ativo'),
    ('flex.importacoes.write', 'Flex - gravar importacoes', 'Criar importacoes no Flex.', 'flex.importacoes', 'write', true, 'ativo'),
    ('flex.financeiro.read', 'Flex - ler financeiro', 'Consultar dados financeiros do Flex.', 'flex.financeiro', 'read', true, 'ativo'),
    ('flex.financeiro.write', 'Flex - gravar financeiro', 'Classificar e alterar dados financeiros do Flex.', 'flex.financeiro', 'write', true, 'ativo'),
    ('flex.colaboradores.read', 'Flex - ler colaboradores', 'Consultar complementos de colaboradores do Flex.', 'flex.colaboradores', 'read', true, 'ativo'),
    ('flex.colaboradores.write', 'Flex - gravar colaboradores', 'Gerenciar complementos de colaboradores do Flex.', 'flex.colaboradores', 'write', true, 'ativo'),
    ('flex.comissoes.read', 'Flex - ler comissoes', 'Consultar comissoes do Flex.', 'flex.comissoes', 'read', true, 'ativo'),
    ('flex.comissoes.write', 'Flex - gravar comissoes', 'Gerenciar comissoes do Flex.', 'flex.comissoes', 'write', true, 'ativo'),
    ('flex.comissoes.approve', 'Flex - aprovar comissoes', 'Aprovar ou rejeitar comissoes do Flex.', 'flex.comissoes', 'approve', true, 'ativo'),
    ('flex.pagamentos.read', 'Flex - ler pagamentos', 'Consultar pagamentos do Flex.', 'flex.pagamentos', 'read', true, 'ativo'),
    ('flex.pagamentos.write', 'Flex - gravar pagamentos', 'Gerenciar pagamentos do Flex.', 'flex.pagamentos', 'write', true, 'ativo'),
    ('flex.pagamentos.reconcile', 'Flex - conciliar pagamentos', 'Conciliar pagamentos do Flex.', 'flex.pagamentos', 'reconcile', true, 'ativo'),
    ('flex.fechamentos.read', 'Flex - ler fechamentos', 'Consultar fechamentos do Flex.', 'flex.fechamentos', 'read', true, 'ativo'),
    ('flex.fechamentos.write', 'Flex - gravar fechamentos', 'Preparar e recalcular fechamentos do Flex.', 'flex.fechamentos', 'write', true, 'ativo'),
    ('flex.fechamentos.close', 'Flex - fechar competencia', 'Fechar ou reabrir competencias do Flex.', 'flex.fechamentos', 'close', true, 'ativo'),
    ('flex.configuracoes.read', 'Flex - ler configuracoes', 'Consultar configuracoes do Flex.', 'flex.configuracoes', 'read', true, 'ativo'),
    ('flex.configuracoes.write', 'Flex - gravar configuracoes', 'Gerenciar configuracoes do Flex.', 'flex.configuracoes', 'write', true, 'ativo')
)
insert into security.permissoes (codigo, nome, descricao, app_id, recurso, acao, sistema, status)
select rows.codigo, rows.nome, rows.descricao, apps.id, rows.recurso, rows.acao, rows.sistema, rows.status::core.status_registro
from rows
left join core.apps apps on apps.codigo = 'flex'
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
