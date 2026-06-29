begin;

create table if not exists gkit_jur.pendencias (
  id uuid primary key default gen_random_uuid(),
  carteira_id uuid references core.carteiras(id) on delete set null,
  processo_id uuid references gkit_jur.processos(id) on delete cascade,
  cliente_id uuid references ciclo.clientes(id) on delete set null,
  tipo text not null,
  origem text not null default 'manual',
  titulo text not null,
  descricao text,
  prioridade text not null default 'media' check (prioridade in ('critica', 'alta', 'media', 'baixa')),
  status text not null default 'aberta' check (status in ('aberta', 'em_tratamento', 'aguardando_terceiro', 'resolvida', 'cancelada')),
  responsavel_id uuid references security.usuarios(id) on delete set null,
  prazo_limite timestamptz,
  entidade_tipo text,
  entidade_id text,
  payload jsonb not null default '{}'::jsonb,
  criado_por uuid references security.usuarios(id) on delete set null,
  resolvido_por uuid references security.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists gkit_jur.eventos_operacionais (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references security.usuarios(id) on delete set null,
  origem text not null default 'gkit_jur',
  entidade_tipo text not null,
  entidade_id text,
  acao text not null,
  descricao text,
  antes jsonb not null default '{}'::jsonb,
  depois jsonb not null default '{}'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists gkit_jur.agente_fontes (
  id uuid primary key default gen_random_uuid(),
  carteira_id uuid references core.carteiras(id) on delete set null,
  nome text not null,
  tipo text not null default 'portal_web',
  url_base text,
  exige_captcha boolean not null default false,
  exige_2fa boolean not null default false,
  ativo boolean not null default true,
  observacoes text,
  config_json jsonb not null default '{}'::jsonb,
  criado_por uuid references security.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists gkit_jur.agente_credenciais (
  id uuid primary key default gen_random_uuid(),
  fonte_id uuid not null references gkit_jur.agente_fontes(id) on delete cascade,
  carteira_id uuid references core.carteiras(id) on delete set null,
  nome text not null,
  usuario_tecnico text,
  segredo_ref text,
  ativo boolean not null default true,
  observacoes text,
  criado_por uuid references security.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists gkit_jur.agente_receitas (
  id uuid primary key default gen_random_uuid(),
  fonte_id uuid references gkit_jur.agente_fontes(id) on delete set null,
  carteira_id uuid references core.carteiras(id) on delete set null,
  nome text not null,
  descricao text,
  tipo_coleta text not null default 'movimentacao',
  periodicidade text not null default 'manual' check (periodicidade in ('manual', 'diaria', 'horaria', 'semanal', 'mensal')),
  script_key text,
  tipo_arquivo_esperado text not null default 'json',
  config_json jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  criado_por uuid references security.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists gkit_jur.agente_execucoes (
  id uuid primary key default gen_random_uuid(),
  receita_id uuid references gkit_jur.agente_receitas(id) on delete set null,
  fonte_id uuid references gkit_jur.agente_fontes(id) on delete set null,
  carteira_id uuid references core.carteiras(id) on delete set null,
  processo_id uuid references gkit_jur.processos(id) on delete set null,
  status text not null default 'pendente' check (status in ('pendente', 'em_execucao', 'sucesso', 'falha', 'precisa_intervencao', 'aguardando_validacao', 'cancelada')),
  solicitado_por uuid references security.usuarios(id) on delete set null,
  iniciado_em timestamptz,
  finalizado_em timestamptz,
  erro_mensagem text,
  tentativas integer not null default 0,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists gkit_jur.agente_arquivos (
  id uuid primary key default gen_random_uuid(),
  execucao_id uuid not null references gkit_jur.agente_execucoes(id) on delete cascade,
  nome_arquivo text not null,
  tipo_arquivo text,
  storage_path text,
  hash_arquivo text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists gkit_jur.agente_logs (
  id uuid primary key default gen_random_uuid(),
  execucao_id uuid not null references gkit_jur.agente_execucoes(id) on delete cascade,
  nivel text not null default 'info' check (nivel in ('debug', 'info', 'warn', 'error')),
  step text,
  mensagem text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists gkit_jur.agente_validacoes (
  id uuid primary key default gen_random_uuid(),
  execucao_id uuid not null references gkit_jur.agente_execucoes(id) on delete cascade,
  validado_por uuid references security.usuarios(id) on delete set null,
  status text not null default 'aguardando_validacao' check (status in ('aguardando_validacao', 'validado', 'rejeitado', 'reenviar_coleta', 'importado_manual')),
  observacao text,
  created_at timestamptz not null default now()
);

create table if not exists gkit_jur.agente_resultados (
  id uuid primary key default gen_random_uuid(),
  execucao_id uuid not null references gkit_jur.agente_execucoes(id) on delete cascade,
  entidade_tipo text,
  entidade_id text,
  status text not null default 'novo' check (status in ('novo', 'processado', 'ignorado', 'erro')),
  dados jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_gkit_jur_pendencias_status_prioridade
  on gkit_jur.pendencias(status, prioridade, prazo_limite);
create index if not exists idx_gkit_jur_pendencias_processo
  on gkit_jur.pendencias(processo_id);
create index if not exists idx_gkit_jur_pendencias_carteira
  on gkit_jur.pendencias(carteira_id);
create index if not exists idx_gkit_jur_eventos_entidade
  on gkit_jur.eventos_operacionais(entidade_tipo, entidade_id, created_at desc);
create index if not exists idx_gkit_jur_agente_fontes_carteira
  on gkit_jur.agente_fontes(carteira_id, ativo);
create index if not exists idx_gkit_jur_agente_receitas_fonte
  on gkit_jur.agente_receitas(fonte_id, ativo);
create index if not exists idx_gkit_jur_agente_execucoes_status
  on gkit_jur.agente_execucoes(status, created_at desc);
create index if not exists idx_gkit_jur_agente_execucoes_carteira
  on gkit_jur.agente_execucoes(carteira_id, created_at desc);
create index if not exists idx_gkit_jur_agente_logs_execucao
  on gkit_jur.agente_logs(execucao_id, created_at desc);
create index if not exists idx_gkit_jur_agente_validacoes_execucao
  on gkit_jur.agente_validacoes(execucao_id, created_at desc);
create index if not exists idx_gkit_jur_agente_resultados_execucao
  on gkit_jur.agente_resultados(execucao_id, created_at desc);

alter table gkit_jur.pendencias enable row level security;
alter table gkit_jur.eventos_operacionais enable row level security;
alter table gkit_jur.agente_fontes enable row level security;
alter table gkit_jur.agente_credenciais enable row level security;
alter table gkit_jur.agente_receitas enable row level security;
alter table gkit_jur.agente_execucoes enable row level security;
alter table gkit_jur.agente_arquivos enable row level security;
alter table gkit_jur.agente_logs enable row level security;
alter table gkit_jur.agente_validacoes enable row level security;
alter table gkit_jur.agente_resultados enable row level security;

drop policy if exists pendencias_read_scope on gkit_jur.pendencias;
create policy pendencias_read_scope on gkit_jur.pendencias
  for select to authenticated
  using (
    (select security.is_admin_global())
    or (
      security.usuario_tem_permissao('gkit_jur.processos.read')
      and (carteira_id is null or security.usuario_tem_carteira(carteira_id))
    )
  );

drop policy if exists pendencias_write_scope on gkit_jur.pendencias;
create policy pendencias_write_scope on gkit_jur.pendencias
  for all to authenticated
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

drop policy if exists eventos_read_scope on gkit_jur.eventos_operacionais;
create policy eventos_read_scope on gkit_jur.eventos_operacionais
  for select to authenticated
  using ((select security.is_admin_global()) or security.usuario_tem_permissao('gkit_jur.processos.read'));

drop policy if exists eventos_write_scope on gkit_jur.eventos_operacionais;
create policy eventos_write_scope on gkit_jur.eventos_operacionais
  for insert to authenticated
  with check ((select security.is_admin_global()) or security.usuario_tem_permissao('gkit_jur.processos.write'));

drop policy if exists agente_fontes_read_scope on gkit_jur.agente_fontes;
create policy agente_fontes_read_scope on gkit_jur.agente_fontes
  for select to authenticated
  using (
    (select security.is_admin_global())
    or (
      security.usuario_tem_permissao('gkit_jur.processos.read')
      and (carteira_id is null or security.usuario_tem_carteira(carteira_id))
    )
  );

drop policy if exists agente_fontes_write_scope on gkit_jur.agente_fontes;
create policy agente_fontes_write_scope on gkit_jur.agente_fontes
  for all to authenticated
  using ((select security.is_admin_global()) or security.usuario_tem_permissao('gkit_jur.admin.write'))
  with check ((select security.is_admin_global()) or security.usuario_tem_permissao('gkit_jur.admin.write'));

drop policy if exists agente_credenciais_read_scope on gkit_jur.agente_credenciais;
create policy agente_credenciais_read_scope on gkit_jur.agente_credenciais
  for select to authenticated
  using ((select security.is_admin_global()) or security.usuario_tem_permissao('gkit_jur.admin.write'));

drop policy if exists agente_credenciais_write_scope on gkit_jur.agente_credenciais;
create policy agente_credenciais_write_scope on gkit_jur.agente_credenciais
  for all to authenticated
  using ((select security.is_admin_global()) or security.usuario_tem_permissao('gkit_jur.admin.write'))
  with check ((select security.is_admin_global()) or security.usuario_tem_permissao('gkit_jur.admin.write'));

drop policy if exists agente_receitas_read_scope on gkit_jur.agente_receitas;
create policy agente_receitas_read_scope on gkit_jur.agente_receitas
  for select to authenticated
  using (
    (select security.is_admin_global())
    or (
      security.usuario_tem_permissao('gkit_jur.processos.read')
      and (carteira_id is null or security.usuario_tem_carteira(carteira_id))
    )
  );

drop policy if exists agente_receitas_write_scope on gkit_jur.agente_receitas;
create policy agente_receitas_write_scope on gkit_jur.agente_receitas
  for all to authenticated
  using ((select security.is_admin_global()) or security.usuario_tem_permissao('gkit_jur.admin.write'))
  with check ((select security.is_admin_global()) or security.usuario_tem_permissao('gkit_jur.admin.write'));

drop policy if exists agente_execucoes_read_scope on gkit_jur.agente_execucoes;
create policy agente_execucoes_read_scope on gkit_jur.agente_execucoes
  for select to authenticated
  using (
    (select security.is_admin_global())
    or (
      security.usuario_tem_permissao('gkit_jur.processos.read')
      and (carteira_id is null or security.usuario_tem_carteira(carteira_id))
    )
  );

drop policy if exists agente_execucoes_write_scope on gkit_jur.agente_execucoes;
create policy agente_execucoes_write_scope on gkit_jur.agente_execucoes
  for all to authenticated
  using (
    (select security.is_admin_global())
    or (
      security.usuario_tem_permissao('gkit_jur.processos.sync')
      and (carteira_id is null or security.usuario_tem_carteira(carteira_id))
    )
  )
  with check (
    (select security.is_admin_global())
    or (
      security.usuario_tem_permissao('gkit_jur.processos.sync')
      and (carteira_id is null or security.usuario_tem_carteira(carteira_id))
    )
  );

drop policy if exists agente_child_read_scope on gkit_jur.agente_logs;
create policy agente_child_read_scope on gkit_jur.agente_logs
  for select to authenticated
  using (
    exists (
      select 1 from gkit_jur.agente_execucoes e
      where e.id = agente_logs.execucao_id
        and (
          (select security.is_admin_global())
          or (
            security.usuario_tem_permissao('gkit_jur.processos.read')
            and (e.carteira_id is null or security.usuario_tem_carteira(e.carteira_id))
          )
        )
    )
  );

drop policy if exists agente_child_write_scope on gkit_jur.agente_logs;
create policy agente_child_write_scope on gkit_jur.agente_logs
  for all to authenticated
  using ((select security.is_admin_global()) or security.usuario_tem_permissao('gkit_jur.processos.sync'))
  with check ((select security.is_admin_global()) or security.usuario_tem_permissao('gkit_jur.processos.sync'));

drop policy if exists agente_arquivos_read_scope on gkit_jur.agente_arquivos;
create policy agente_arquivos_read_scope on gkit_jur.agente_arquivos
  for select to authenticated
  using (
    exists (
      select 1 from gkit_jur.agente_execucoes e
      where e.id = agente_arquivos.execucao_id
        and (
          (select security.is_admin_global())
          or (
            security.usuario_tem_permissao('gkit_jur.processos.read')
            and (e.carteira_id is null or security.usuario_tem_carteira(e.carteira_id))
          )
        )
    )
  );

drop policy if exists agente_arquivos_write_scope on gkit_jur.agente_arquivos;
create policy agente_arquivos_write_scope on gkit_jur.agente_arquivos
  for all to authenticated
  using ((select security.is_admin_global()) or security.usuario_tem_permissao('gkit_jur.processos.sync'))
  with check ((select security.is_admin_global()) or security.usuario_tem_permissao('gkit_jur.processos.sync'));

drop policy if exists agente_validacoes_read_scope on gkit_jur.agente_validacoes;
create policy agente_validacoes_read_scope on gkit_jur.agente_validacoes
  for select to authenticated
  using (
    exists (
      select 1 from gkit_jur.agente_execucoes e
      where e.id = agente_validacoes.execucao_id
        and (
          (select security.is_admin_global())
          or (
            security.usuario_tem_permissao('gkit_jur.processos.read')
            and (e.carteira_id is null or security.usuario_tem_carteira(e.carteira_id))
          )
        )
    )
  );

drop policy if exists agente_validacoes_write_scope on gkit_jur.agente_validacoes;
create policy agente_validacoes_write_scope on gkit_jur.agente_validacoes
  for all to authenticated
  using ((select security.is_admin_global()) or security.usuario_tem_permissao('gkit_jur.processos.write'))
  with check ((select security.is_admin_global()) or security.usuario_tem_permissao('gkit_jur.processos.write'));

drop policy if exists agente_resultados_read_scope on gkit_jur.agente_resultados;
create policy agente_resultados_read_scope on gkit_jur.agente_resultados
  for select to authenticated
  using (
    exists (
      select 1 from gkit_jur.agente_execucoes e
      where e.id = agente_resultados.execucao_id
        and (
          (select security.is_admin_global())
          or (
            security.usuario_tem_permissao('gkit_jur.processos.read')
            and (e.carteira_id is null or security.usuario_tem_carteira(e.carteira_id))
          )
        )
    )
  );

drop policy if exists agente_resultados_write_scope on gkit_jur.agente_resultados;
create policy agente_resultados_write_scope on gkit_jur.agente_resultados
  for all to authenticated
  using ((select security.is_admin_global()) or security.usuario_tem_permissao('gkit_jur.processos.sync'))
  with check ((select security.is_admin_global()) or security.usuario_tem_permissao('gkit_jur.processos.sync'));

grant usage on schema gkit_jur to authenticated, service_role;
grant select on
  gkit_jur.pendencias,
  gkit_jur.eventos_operacionais,
  gkit_jur.agente_fontes,
  gkit_jur.agente_receitas,
  gkit_jur.agente_execucoes,
  gkit_jur.agente_arquivos,
  gkit_jur.agente_logs,
  gkit_jur.agente_validacoes,
  gkit_jur.agente_resultados
to authenticated;
grant select, insert, update, delete on
  gkit_jur.pendencias,
  gkit_jur.eventos_operacionais,
  gkit_jur.agente_fontes,
  gkit_jur.agente_credenciais,
  gkit_jur.agente_receitas,
  gkit_jur.agente_execucoes,
  gkit_jur.agente_arquivos,
  gkit_jur.agente_logs,
  gkit_jur.agente_validacoes,
  gkit_jur.agente_resultados
to service_role;

with rows(codigo, nome, descricao, recurso, acao, sistema, status) as (
  values
    ('gkit_jur.inbox.read', 'GKIT Jur - ler inbox', 'Consultar caixa de entrada operacional juridica.', 'gkit_jur.inbox', 'read', true, 'ativo'),
    ('gkit_jur.inbox.write', 'GKIT Jur - gravar inbox', 'Resolver pendencias e executar acoes do inbox juridico.', 'gkit_jur.inbox', 'write', true, 'ativo'),
    ('gkit_jur.agente.read', 'GKIT Jur - ler agente', 'Consultar fontes, receitas e execucoes do agente juridico.', 'gkit_jur.agente', 'read', true, 'ativo'),
    ('gkit_jur.agente.write', 'GKIT Jur - configurar agente', 'Configurar fontes, receitas e validacoes do agente juridico.', 'gkit_jur.agente', 'write', true, 'ativo')
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

comment on table gkit_jur.pendencias is 'Travas operacionais persistentes do Inbox juridico.';
comment on table gkit_jur.eventos_operacionais is 'Eventos operacionais e auditoria fina do Inbox e agente juridico.';
comment on table gkit_jur.agente_fontes is 'Fontes externas ou internas usadas pelo agente de automacao juridica.';
comment on table gkit_jur.agente_credenciais is 'Referencias seguras para credenciais do agente; segredos reais devem ficar fora da tabela.';
comment on table gkit_jur.agente_receitas is 'Receitas configuraveis para coletas e rotinas do agente juridico.';
comment on table gkit_jur.agente_execucoes is 'Historico de execucoes do agente juridico.';
comment on table gkit_jur.agente_arquivos is 'Arquivos coletados ou produzidos por execucoes do agente.';
comment on table gkit_jur.agente_logs is 'Logs passo a passo das execucoes do agente.';
comment on table gkit_jur.agente_validacoes is 'Validacoes humanas de resultados sensiveis do agente.';
comment on table gkit_jur.agente_resultados is 'Resultados estruturados produzidos por execucoes do agente.';

notify pgrst, 'reload schema';

commit;
