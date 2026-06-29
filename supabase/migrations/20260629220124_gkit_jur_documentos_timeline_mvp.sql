begin;

create table if not exists gkit_jur.documentos (
  id uuid primary key default gen_random_uuid(),
  processo_id uuid not null references gkit_jur.processos(id) on delete cascade,
  tarefa_id uuid references gkit_jur.tarefas(id) on delete set null,
  carteira_id uuid references core.carteiras(id) on delete set null,
  responsavel_id uuid references security.usuarios(id) on delete set null,
  tipo text not null default 'documento_interno' check (
    tipo in (
      'peticao',
      'publicacao',
      'decisao',
      'ata',
      'comprovante',
      'documento_interno',
      'contrato',
      'procuracao',
      'outro'
    )
  ),
  titulo text not null,
  descricao text,
  status text not null default 'ativo' check (status in ('ativo', 'arquivado', 'cancelado')),
  data_documento timestamptz,
  url_externa text,
  storage_path text,
  hash_arquivo text,
  origem text not null default 'manual',
  origem_id text,
  origem_hash text,
  payload jsonb not null default '{}'::jsonb,
  criado_por uuid references security.usuarios(id) on delete set null,
  atualizado_por uuid references security.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists gkit_jur.eventos_processo (
  id uuid primary key default gen_random_uuid(),
  processo_id uuid not null references gkit_jur.processos(id) on delete cascade,
  tarefa_id uuid references gkit_jur.tarefas(id) on delete set null,
  documento_id uuid references gkit_jur.documentos(id) on delete set null,
  carteira_id uuid references core.carteiras(id) on delete set null,
  responsavel_id uuid references security.usuarios(id) on delete set null,
  tipo text not null default 'providencia_interna' check (
    tipo in (
      'publicacao',
      'intimacao',
      'despacho',
      'decisao',
      'audiencia',
      'prazo',
      'protocolo',
      'contato',
      'providencia_interna',
      'documento',
      'nota'
    )
  ),
  titulo text not null,
  descricao text,
  data_evento timestamptz not null default now(),
  origem text not null default 'manual',
  origem_id text,
  origem_hash text,
  payload jsonb not null default '{}'::jsonb,
  criado_por uuid references security.usuarios(id) on delete set null,
  atualizado_por uuid references security.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists gkit_jur_documentos_origem_hash_unique
  on gkit_jur.documentos(origem, origem_hash)
  where origem_hash is not null;

create unique index if not exists gkit_jur_eventos_processo_origem_hash_unique
  on gkit_jur.eventos_processo(origem, origem_hash)
  where origem_hash is not null;

create index if not exists idx_gkit_jur_documentos_processo_data
  on gkit_jur.documentos(processo_id, status, data_documento desc nulls last, created_at desc);
create index if not exists idx_gkit_jur_documentos_carteira_status
  on gkit_jur.documentos(carteira_id, status, data_documento desc nulls last);

create index if not exists idx_gkit_jur_eventos_processo_processo_data
  on gkit_jur.eventos_processo(processo_id, data_evento desc);
create index if not exists idx_gkit_jur_eventos_processo_carteira_data
  on gkit_jur.eventos_processo(carteira_id, data_evento desc);

alter table gkit_jur.documentos enable row level security;
alter table gkit_jur.eventos_processo enable row level security;

drop policy if exists documentos_read_scope on gkit_jur.documentos;
create policy documentos_read_scope on gkit_jur.documentos
  for select to authenticated
  using (
    (select security.is_admin_global())
    or (
      security.usuario_tem_permissao('gkit_jur.documentos.read')
      and (
        carteira_id is null
        or security.usuario_tem_carteira(carteira_id)
        or exists (
          select 1
          from gkit_jur.processos p
          where p.id = documentos.processo_id
            and (p.carteira_id is null or security.usuario_tem_carteira(p.carteira_id))
        )
      )
    )
  );

drop policy if exists documentos_write_scope on gkit_jur.documentos;
create policy documentos_write_scope on gkit_jur.documentos
  for all to authenticated
  using (
    (select security.is_admin_global())
    or (
      security.usuario_tem_permissao('gkit_jur.documentos.write')
      and (
        carteira_id is null
        or security.usuario_tem_carteira(carteira_id)
        or exists (
          select 1
          from gkit_jur.processos p
          where p.id = documentos.processo_id
            and (p.carteira_id is null or security.usuario_tem_carteira(p.carteira_id))
        )
      )
    )
  )
  with check (
    (select security.is_admin_global())
    or (
      security.usuario_tem_permissao('gkit_jur.documentos.write')
      and (
        carteira_id is null
        or security.usuario_tem_carteira(carteira_id)
        or exists (
          select 1
          from gkit_jur.processos p
          where p.id = documentos.processo_id
            and (p.carteira_id is null or security.usuario_tem_carteira(p.carteira_id))
        )
      )
    )
  );

drop policy if exists eventos_processo_read_scope on gkit_jur.eventos_processo;
create policy eventos_processo_read_scope on gkit_jur.eventos_processo
  for select to authenticated
  using (
    (select security.is_admin_global())
    or (
      security.usuario_tem_permissao('gkit_jur.eventos.read')
      and (
        carteira_id is null
        or security.usuario_tem_carteira(carteira_id)
        or exists (
          select 1
          from gkit_jur.processos p
          where p.id = eventos_processo.processo_id
            and (p.carteira_id is null or security.usuario_tem_carteira(p.carteira_id))
        )
      )
    )
  );

drop policy if exists eventos_processo_write_scope on gkit_jur.eventos_processo;
create policy eventos_processo_write_scope on gkit_jur.eventos_processo
  for all to authenticated
  using (
    (select security.is_admin_global())
    or (
      security.usuario_tem_permissao('gkit_jur.eventos.write')
      and (
        carteira_id is null
        or security.usuario_tem_carteira(carteira_id)
        or exists (
          select 1
          from gkit_jur.processos p
          where p.id = eventos_processo.processo_id
            and (p.carteira_id is null or security.usuario_tem_carteira(p.carteira_id))
        )
      )
    )
  )
  with check (
    (select security.is_admin_global())
    or (
      security.usuario_tem_permissao('gkit_jur.eventos.write')
      and (
        carteira_id is null
        or security.usuario_tem_carteira(carteira_id)
        or exists (
          select 1
          from gkit_jur.processos p
          where p.id = eventos_processo.processo_id
            and (p.carteira_id is null or security.usuario_tem_carteira(p.carteira_id))
        )
      )
    )
  );

grant usage on schema gkit_jur to authenticated, service_role;
grant select on gkit_jur.documentos, gkit_jur.eventos_processo to authenticated;
grant select, insert, update, delete on gkit_jur.documentos, gkit_jur.eventos_processo to service_role;

with rows(codigo, nome, descricao, recurso, acao, sistema, status) as (
  values
    ('gkit_jur.documentos.read', 'GKIT Jur - ler documentos', 'Consultar documentos vinculados aos processos juridicos.', 'gkit_jur.documentos', 'read', true, 'ativo'),
    ('gkit_jur.documentos.write', 'GKIT Jur - gravar documentos', 'Registrar e atualizar documentos vinculados aos processos juridicos.', 'gkit_jur.documentos', 'write', true, 'ativo'),
    ('gkit_jur.eventos.read', 'GKIT Jur - ler eventos', 'Consultar eventos operacionais da timeline dos processos juridicos.', 'gkit_jur.eventos', 'read', true, 'ativo'),
    ('gkit_jur.eventos.write', 'GKIT Jur - gravar eventos', 'Registrar eventos operacionais na timeline dos processos juridicos.', 'gkit_jur.eventos', 'write', true, 'ativo')
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

comment on table gkit_jur.documentos is 'Documentos e referencias documentais vinculados aos processos juridicos.';
comment on table gkit_jur.eventos_processo is 'Eventos manuais ou automatizados que compoem a timeline operacional do processo.';
comment on column gkit_jur.documentos.origem_hash is 'Chave de idempotencia para integracoes futuras de documentos.';
comment on column gkit_jur.eventos_processo.origem_hash is 'Chave de idempotencia para integracoes futuras de eventos.';

notify pgrst, 'reload schema';

commit;
