begin;

create extension if not exists pgcrypto;

do $$
declare
  flex_clientes_count bigint;
begin
  if to_regclass('public.gkit_flex_clientes') is not null then
    execute 'select count(*) from public.gkit_flex_clientes' into flex_clientes_count;

    if flex_clientes_count = 0 then
      drop table public.gkit_flex_clientes;

      delete from security.permissoes
      where codigo in (
        'gkit_flex.clientes.read',
        'gkit_flex.clientes.write',
        'gkit_flex.faturamento.read',
        'gkit_flex.faturamento.write'
      );
    end if;
  end if;
end $$;

alter table ciclo.clientes
  add column if not exists tipo_cliente text not null default 'mensal';

alter table ciclo.clientes
  add column if not exists tipo_pessoa text not null default 'condominio';

alter table ciclo.clientes
  drop constraint if exists clientes_tipo_cliente_chk;

alter table ciclo.clientes
  add constraint clientes_tipo_cliente_chk
  check (tipo_cliente in ('mensal', 'pontual', 'cobranca'));

alter table ciclo.clientes
  drop constraint if exists clientes_tipo_pessoa_chk;

alter table ciclo.clientes
  add constraint clientes_tipo_pessoa_chk
  check (tipo_pessoa in ('pessoa_fisica', 'pessoa_juridica', 'condominio'));

create schema if not exists gkit_fat;

create or replace function gkit_fat.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

create table if not exists gkit_fat.servicos (
  codigo text primary key,
  descricao text not null,
  descricao_fiscal_padrao text not null,
  item_lc116 text,
  aliquota_iss numeric(7,4),
  gerar_financeiro boolean not null default true,
  ativo boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists gkit_fat.contratos_servico (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique,
  cliente_id uuid not null references ciclo.clientes(id) on delete restrict,
  tomador_id uuid references ciclo.clientes(id) on delete set null,
  carteira_id uuid references core.carteiras(id) on delete set null,
  servico_codigo text not null default '03220' references gkit_fat.servicos(codigo),
  tipo_faturamento text not null default 'mensal'
    check (tipo_faturamento in ('mensal', 'pontual', 'cobranca')),
  periodicidade_meses integer not null default 1 check (periodicidade_meses > 0),
  dia_faturamento integer check (dia_faturamento is null or dia_faturamento between 1 and 31),
  dia_vencimento integer check (dia_vencimento is null or dia_vencimento between 1 and 31),
  inicio_vigencia date,
  fim_vigencia date,
  valor_padrao numeric(14,2) not null default 0 check (valor_padrao >= 0),
  descricao_servico text not null default 'Servicos advocaticios',
  iss_retido boolean not null default false,
  gerar_financeiro boolean not null default true,
  status text not null default 'em_elaboracao'
    check (status in ('em_elaboracao', 'ativo', 'suspenso', 'cancelado', 'encerrado')),
  motivo_status text,
  observacoes text,
  dados_fiscais jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  criado_por uuid references security.usuarios(id) on delete set null,
  atualizado_por uuid references security.usuarios(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists gkit_fat.previsoes_faturamento (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references gkit_fat.contratos_servico(id) on delete cascade,
  cliente_id uuid not null references ciclo.clientes(id) on delete restrict,
  carteira_id uuid references core.carteiras(id) on delete set null,
  competencia date not null,
  periodo_inicio date,
  periodo_fim date,
  data_prevista date,
  data_vencimento date,
  tipo_faturamento text not null default 'recorrente'
    check (tipo_faturamento in ('recorrente', 'adicional', 'antecipado', 'ajuste')),
  valor_previsto numeric(14,2) not null default 0 check (valor_previsto >= 0),
  status text not null default 'prevista'
    check (status in ('prevista', 'gerada', 'suspensa', 'cancelada')),
  metadata jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint previsoes_faturamento_unique unique (contrato_id, competencia, tipo_faturamento)
);

create table if not exists gkit_fat.ordens_servico (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique,
  contrato_id uuid references gkit_fat.contratos_servico(id) on delete set null,
  previsao_id uuid references gkit_fat.previsoes_faturamento(id) on delete set null,
  cliente_id uuid not null references ciclo.clientes(id) on delete restrict,
  tomador_id uuid references ciclo.clientes(id) on delete set null,
  carteira_id uuid references core.carteiras(id) on delete set null,
  origem text not null default 'manual'
    check (origem in ('manual', 'contrato_recorrente', 'contrato_adicional', 'duplicacao', 'importacao', 'api')),
  competencia date,
  periodo_inicio date,
  periodo_fim date,
  data_prevista_faturamento date,
  data_vencimento date,
  servico_codigo text not null default '03220' references gkit_fat.servicos(codigo),
  descricao_servico text not null,
  quantidade numeric(14,4) not null default 1 check (quantidade > 0),
  valor_unitario numeric(14,2) not null default 0 check (valor_unitario >= 0),
  valor_total numeric(14,2) generated always as (round((quantidade * valor_unitario)::numeric, 2)) stored,
  situacao_operacional text not null default 'rascunho'
    check (situacao_operacional in ('rascunho', 'em_conferencia', 'pronta_para_faturar', 'faturada', 'cancelada')),
  situacao_fiscal text not null default 'nao_enviada'
    check (situacao_fiscal in ('nao_configurada', 'nao_enviada', 'validando', 'autorizada', 'rejeitada', 'cancelada', 'substituida', 'manual_pendente')),
  situacao_financeira text not null default 'prevista'
    check (situacao_financeira in ('nao_gerar_financeiro', 'aguardando_fiscal', 'prevista', 'gerada', 'parcialmente_recebida', 'recebida', 'cancelada')),
  tomador_snapshot jsonb not null default '{}'::jsonb,
  servico_snapshot jsonb not null default '{}'::jsonb,
  nfse_payload jsonb not null default '{}'::jsonb,
  retorno_emissao jsonb not null default '{}'::jsonb,
  observacoes text,
  criado_por uuid references security.usuarios(id) on delete set null,
  atualizado_por uuid references security.usuarios(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_gkit_fat_contratos_cliente
  on gkit_fat.contratos_servico(cliente_id, status);

create index if not exists idx_gkit_fat_contratos_carteira
  on gkit_fat.contratos_servico(carteira_id);

create index if not exists idx_gkit_fat_previsoes_competencia
  on gkit_fat.previsoes_faturamento(competencia, status);

create index if not exists idx_gkit_fat_ordens_competencia
  on gkit_fat.ordens_servico(competencia, situacao_operacional, situacao_fiscal, situacao_financeira);

create index if not exists idx_gkit_fat_ordens_cliente
  on gkit_fat.ordens_servico(cliente_id);

drop trigger if exists set_updated_at_servicos on gkit_fat.servicos;
create trigger set_updated_at_servicos
before update on gkit_fat.servicos
for each row execute function gkit_fat.set_updated_at();

drop trigger if exists set_updated_at_contratos on gkit_fat.contratos_servico;
create trigger set_updated_at_contratos
before update on gkit_fat.contratos_servico
for each row execute function gkit_fat.set_updated_at();

drop trigger if exists set_updated_at_previsoes on gkit_fat.previsoes_faturamento;
create trigger set_updated_at_previsoes
before update on gkit_fat.previsoes_faturamento
for each row execute function gkit_fat.set_updated_at();

drop trigger if exists set_updated_at_ordens on gkit_fat.ordens_servico;
create trigger set_updated_at_ordens
before update on gkit_fat.ordens_servico
for each row execute function gkit_fat.set_updated_at();

insert into gkit_fat.servicos (codigo, descricao, descricao_fiscal_padrao, item_lc116, aliquota_iss)
values ('03220', 'Advocacia', 'Servicos advocaticios', '17.14', null)
on conflict (codigo) do update
set
  descricao = excluded.descricao,
  descricao_fiscal_padrao = excluded.descricao_fiscal_padrao,
  item_lc116 = excluded.item_lc116,
  ativo = true;

alter table gkit_fat.servicos enable row level security;
alter table gkit_fat.contratos_servico enable row level security;
alter table gkit_fat.previsoes_faturamento enable row level security;
alter table gkit_fat.ordens_servico enable row level security;

grant usage on schema gkit_fat to authenticated, service_role;
grant select on all tables in schema gkit_fat to authenticated;
grant select, insert, update, delete on all tables in schema gkit_fat to service_role;
grant usage on all sequences in schema gkit_fat to service_role;

alter role authenticator set pgrst.db_schemas = 'public, graphql_public, audit, core, security, ciclo, gkit_new, gkit_ate, gkit_performa, gkit_jur, gkit_fat';

do $$
declare
  table_name text;
begin
  foreach table_name in array array['servicos', 'contratos_servico', 'previsoes_faturamento', 'ordens_servico']
  loop
    execute format('drop policy if exists %I on gkit_fat.%I', table_name || '_read_scope', table_name);
    execute format(
      'create policy %I on gkit_fat.%I for select to authenticated using (security.usuario_tem_permissao(%L) or security.usuario_tem_permissao(%L) or security.usuario_tem_permissao(%L))',
      table_name || '_read_scope',
      table_name,
      'gkit_fat.dashboard.read',
      'gkit_fat.contratos.read',
      'gkit_fat.faturas.read'
    );
  end loop;
end $$;

insert into core.apps (codigo, nome, descricao, status, url_path, ordem)
values (
  'gkit_fat',
  'GKIT FAT',
  'Faturamento de servicos advocaticios 03220 com contratos, previsoes e OS/NFS-e.',
  'ativo',
  '/modulos/gkit-fat',
  47
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
    ('gkit_fat.dashboard.read', 'GKIT FAT - painel', 'Consultar cockpit de faturamento de servicos.', 'gkit_fat.dashboard', 'read', true, 'ativo'),
    ('gkit_fat.contratos.read', 'GKIT FAT - ler contratos', 'Consultar contratos de faturamento de servicos.', 'gkit_fat.contratos', 'read', true, 'ativo'),
    ('gkit_fat.contratos.write', 'GKIT FAT - gravar contratos', 'Gerenciar contratos de faturamento de servicos.', 'gkit_fat.contratos', 'write', true, 'ativo'),
    ('gkit_fat.faturas.read', 'GKIT FAT - ler OS/faturas', 'Consultar previsoes, OS e preparo de NFS-e.', 'gkit_fat.faturas', 'read', true, 'ativo'),
    ('gkit_fat.faturas.write', 'GKIT FAT - gravar OS/faturas', 'Gerar e atualizar OS de faturamento de servicos.', 'gkit_fat.faturas', 'write', true, 'ativo'),
    ('gkit_fat.configuracoes.read', 'GKIT FAT - ler configuracoes', 'Consultar parametros fiscais do servico 03220.', 'gkit_fat.configuracoes', 'read', true, 'ativo'),
    ('gkit_fat.configuracoes.write', 'GKIT FAT - gravar configuracoes', 'Gerenciar parametros fiscais do servico 03220.', 'gkit_fat.configuracoes', 'write', true, 'ativo')
)
insert into security.permissoes (codigo, nome, descricao, app_id, recurso, acao, sistema, status)
select rows.codigo, rows.nome, rows.descricao, apps.id, rows.recurso, rows.acao, rows.sistema, rows.status::core.status_registro
from rows
left join core.apps apps on apps.codigo = 'gkit_fat'
on conflict (codigo) do update
set
  nome = excluded.nome,
  descricao = excluded.descricao,
  app_id = excluded.app_id,
  recurso = excluded.recurso,
  acao = excluded.acao,
  sistema = excluded.sistema,
  status = excluded.status;

insert into security.usuario_app_acessos (usuario_id, app_id, ativo)
select distinct access.usuario_id, fat.id, true
from security.usuario_app_acessos access
join core.apps flex on flex.id = access.app_id and flex.codigo = 'gkit_flex'
join core.apps fat on fat.codigo = 'gkit_fat'
where access.ativo = true
on conflict (usuario_id, app_id) do update
set ativo = excluded.ativo;

notify pgrst, 'reload config';
notify pgrst, 'reload schema';

commit;
