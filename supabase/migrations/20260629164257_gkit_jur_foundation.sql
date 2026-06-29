begin;

create schema if not exists gkit_jur;

create table if not exists gkit_jur.processos (
  id uuid primary key default gen_random_uuid(),
  numero_cnj text not null,
  numero_cnj_limpo text not null,
  tribunal_sigla text,
  tribunal_alias text,
  grau text,
  classe_codigo bigint,
  classe_nome text,
  sistema_codigo bigint,
  sistema_nome text,
  formato_codigo bigint,
  formato_nome text,
  nivel_sigilo bigint,
  orgao_julgador_codigo bigint,
  orgao_julgador_nome text,
  orgao_julgador_codigo_municipio_ibge bigint,
  data_ajuizamento timestamptz,
  data_hora_ultima_atualizacao_datajud timestamptz,
  cliente_id uuid references ciclo.clientes(id) on delete set null,
  carteira_id uuid references core.carteiras(id) on delete set null,
  responsavel_id uuid references security.usuarios(id) on delete set null,
  administradora_id uuid references ciclo.administradoras(id) on delete set null,
  origem_modulo text,
  origem_id uuid,
  status text not null default 'ativo' check (status in ('ativo', 'arquivado', 'suspenso', 'encerrado', 'erro')),
  status_monitoramento text not null default 'monitorando' check (status_monitoramento in ('monitorando', 'pausado', 'erro', 'nao_monitorar')),
  ultima_sincronizacao_em timestamptz,
  ultima_movimentacao_em timestamptz,
  datajud_id text,
  datajud_index text,
  datajud_score numeric,
  assuntos jsonb not null default '[]'::jsonb,
  metadata_datajud jsonb not null default '{}'::jsonb,
  observacoes text,
  criado_por uuid references security.usuarios(id) on delete set null,
  atualizado_por uuid references security.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gkit_jur_processos_numero_cnj_limpo_unique unique (numero_cnj_limpo)
);

create table if not exists gkit_jur.movimentacoes (
  id uuid primary key default gen_random_uuid(),
  processo_id uuid not null references gkit_jur.processos(id) on delete cascade,
  codigo bigint,
  nome text not null,
  data_hora timestamptz,
  orgao_codigo bigint,
  orgao_nome text,
  complementos_tabelados jsonb not null default '[]'::jsonb,
  raw_movimento jsonb not null default '{}'::jsonb,
  hash_movimento text not null,
  origem text not null default 'datajud',
  relevante boolean not null default false,
  gera_alerta boolean not null default false,
  alerta_gerado boolean not null default false,
  created_at timestamptz not null default now(),
  constraint gkit_jur_movimentacoes_hash_unique unique (processo_id, hash_movimento)
);

create table if not exists gkit_jur.sincronizacoes (
  id uuid primary key default gen_random_uuid(),
  processo_id uuid references gkit_jur.processos(id) on delete set null,
  numero_cnj_limpo text not null,
  tribunal_alias text not null,
  provedor text not null default 'datajud',
  status text not null check (status in ('sucesso', 'erro', 'sem_resultado', 'parcial', 'timeout')),
  http_status integer,
  total_resultados integer,
  total_movimentacoes_recebidas integer not null default 0,
  total_movimentacoes_novas integer not null default 0,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  erro_codigo text,
  erro_mensagem text,
  request_payload jsonb not null default '{}'::jsonb,
  response_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists gkit_jur.monitoramentos (
  id uuid primary key default gen_random_uuid(),
  processo_id uuid not null references gkit_jur.processos(id) on delete cascade,
  ativo boolean not null default true,
  frequencia text not null default 'diaria' check (frequencia in ('manual', 'diaria', 'semanal', 'mensal')),
  ultima_execucao_em timestamptz,
  proxima_execucao_em timestamptz,
  falhas_consecutivas integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gkit_jur_monitoramentos_processo_unique unique (processo_id)
);

create index if not exists idx_gkit_jur_processos_cliente_id
  on gkit_jur.processos(cliente_id);
create index if not exists idx_gkit_jur_processos_carteira_id
  on gkit_jur.processos(carteira_id);
create index if not exists idx_gkit_jur_processos_responsavel_id
  on gkit_jur.processos(responsavel_id);
create index if not exists idx_gkit_jur_processos_status
  on gkit_jur.processos(status);
create index if not exists idx_gkit_jur_processos_monitoramento
  on gkit_jur.processos(status_monitoramento);
create index if not exists idx_gkit_jur_processos_ultima_movimentacao
  on gkit_jur.processos(ultima_movimentacao_em desc);
create index if not exists idx_gkit_jur_movimentacoes_processo_data
  on gkit_jur.movimentacoes(processo_id, data_hora desc);
create index if not exists idx_gkit_jur_sincronizacoes_processo
  on gkit_jur.sincronizacoes(processo_id, started_at desc);

alter table gkit_jur.processos enable row level security;
alter table gkit_jur.movimentacoes enable row level security;
alter table gkit_jur.sincronizacoes enable row level security;
alter table gkit_jur.monitoramentos enable row level security;

drop policy if exists processos_read_scope on gkit_jur.processos;
create policy processos_read_scope on gkit_jur.processos
  for select to authenticated
  using (
    (select security.is_admin_global())
    or (
      security.usuario_tem_permissao('gkit_jur.processos.read')
      and (carteira_id is null or security.usuario_tem_carteira(carteira_id))
    )
  );

drop policy if exists processos_insert_scope on gkit_jur.processos;
create policy processos_insert_scope on gkit_jur.processos
  for insert to authenticated
  with check (
    (select security.is_admin_global())
    or (
      security.usuario_tem_permissao('gkit_jur.processos.write')
      and (carteira_id is null or security.usuario_tem_carteira(carteira_id))
    )
  );

drop policy if exists processos_update_scope on gkit_jur.processos;
create policy processos_update_scope on gkit_jur.processos
  for update to authenticated
  using (
    (select security.is_admin_global())
    or (
      security.usuario_tem_permissao('gkit_jur.processos.write')
      and (carteira_id is null or security.usuario_tem_carteira(carteira_id))
    )
  )
  with check (
    (select security.is_admin_global())
    or (
      security.usuario_tem_permissao('gkit_jur.processos.write')
      and (carteira_id is null or security.usuario_tem_carteira(carteira_id))
    )
  );

drop policy if exists movimentacoes_read_scope on gkit_jur.movimentacoes;
create policy movimentacoes_read_scope on gkit_jur.movimentacoes
  for select to authenticated
  using (
    exists (
      select 1
      from gkit_jur.processos p
      where p.id = movimentacoes.processo_id
        and (
          (select security.is_admin_global())
          or (
            security.usuario_tem_permissao('gkit_jur.processos.read')
            and (p.carteira_id is null or security.usuario_tem_carteira(p.carteira_id))
          )
        )
    )
  );

drop policy if exists movimentacoes_write_scope on gkit_jur.movimentacoes;
create policy movimentacoes_write_scope on gkit_jur.movimentacoes
  for insert to authenticated
  with check ((select security.is_admin_global()) or security.usuario_tem_permissao('gkit_jur.processos.sync'));

drop policy if exists sincronizacoes_read_scope on gkit_jur.sincronizacoes;
create policy sincronizacoes_read_scope on gkit_jur.sincronizacoes
  for select to authenticated
  using ((select security.is_admin_global()) or security.usuario_tem_permissao('gkit_jur.processos.read'));

drop policy if exists sincronizacoes_write_scope on gkit_jur.sincronizacoes;
create policy sincronizacoes_write_scope on gkit_jur.sincronizacoes
  for insert to authenticated
  with check ((select security.is_admin_global()) or security.usuario_tem_permissao('gkit_jur.processos.sync'));

drop policy if exists monitoramentos_read_scope on gkit_jur.monitoramentos;
create policy monitoramentos_read_scope on gkit_jur.monitoramentos
  for select to authenticated
  using ((select security.is_admin_global()) or security.usuario_tem_permissao('gkit_jur.processos.read'));

drop policy if exists monitoramentos_write_scope on gkit_jur.monitoramentos;
create policy monitoramentos_write_scope on gkit_jur.monitoramentos
  for all to authenticated
  using ((select security.is_admin_global()) or security.usuario_tem_permissao('gkit_jur.processos.write'))
  with check ((select security.is_admin_global()) or security.usuario_tem_permissao('gkit_jur.processos.write'));

grant usage on schema gkit_jur to authenticated, service_role;
grant select on all tables in schema gkit_jur to authenticated;
grant select, insert, update, delete on all tables in schema gkit_jur to service_role;

with rows(codigo, nome, descricao, recurso, acao, sistema, status) as (
  values
    ('gkit_jur.processos.read', 'GKIT Jur - ler processos', 'Consultar processos acompanhados.', 'gkit_jur.processos', 'read', true, 'ativo'),
    ('gkit_jur.processos.write', 'GKIT Jur - gravar processos', 'Criar e atualizar processos acompanhados.', 'gkit_jur.processos', 'write', true, 'ativo'),
    ('gkit_jur.processos.sync', 'GKIT Jur - sincronizar processos', 'Executar sincronizacao manual de processos.', 'gkit_jur.processos', 'sync', true, 'ativo'),
    ('gkit_jur.processos.archive', 'GKIT Jur - arquivar processos', 'Arquivar processos acompanhados.', 'gkit_jur.processos', 'archive', true, 'ativo'),
    ('gkit_jur.admin.read', 'GKIT Jur - ler cadastros', 'Consultar cadastros auxiliares juridicos.', 'gkit_jur.admin', 'read', true, 'ativo'),
    ('gkit_jur.admin.write', 'GKIT Jur - gravar cadastros', 'Gerenciar cadastros auxiliares juridicos.', 'gkit_jur.admin', 'write', true, 'ativo')
)
insert into security.permissoes (codigo, nome, descricao, app_id, recurso, acao, sistema, status)
select rows.codigo, rows.nome, rows.descricao, apps.id, rows.recurso, rows.acao, rows.sistema, rows.status::core.status_registro
from rows
left join core.apps apps on apps.codigo = 'gkit_jur'
on conflict (codigo) do update
set
  nome = excluded.nome,
  descricao = excluded.descricao,
  app_id = excluded.app_id,
  recurso = excluded.recurso,
  acao = excluded.acao,
  sistema = excluded.sistema,
  status = excluded.status;

alter role authenticator set pgrst.db_schemas =
  'public, graphql_public, audit, core, security, ciclo, gkit_new, gkit_ate, gkit_performa, gkit_jur';

comment on schema gkit_jur is 'Modulo GKIT Jur para processos, movimentacoes, sincronizacoes e monitoramento juridico.';
comment on table gkit_jur.processos is 'Processos judiciais acompanhados pelo GKIT Jur.';
comment on table gkit_jur.movimentacoes is 'Movimentacoes processuais deduplicadas por processo.';
comment on table gkit_jur.sincronizacoes is 'Historico de tentativas de sincronizacao manual ou automatica.';
comment on table gkit_jur.monitoramentos is 'Configuracao futura de monitoramento recorrente por processo.';

notify pgrst, 'reload config';
notify pgrst, 'reload schema';

commit;
