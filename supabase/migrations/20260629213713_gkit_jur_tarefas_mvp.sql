begin;

create table if not exists gkit_jur.tarefas (
  id uuid primary key default gen_random_uuid(),
  processo_id uuid not null references gkit_jur.processos(id) on delete cascade,
  carteira_id uuid references core.carteiras(id) on delete set null,
  responsavel_id uuid references security.usuarios(id) on delete set null,
  tipo text not null default 'providencia_interna' check (
    tipo in (
      'prazo',
      'publicacao',
      'movimentacao_relevante',
      'documento_pendente',
      'providencia_interna',
      'audiencia',
      'cumprimento',
      'revisao'
    )
  ),
  titulo text not null,
  descricao text,
  status text not null default 'aberta' check (
    status in ('aberta', 'em_andamento', 'aguardando_terceiro', 'concluida', 'cancelada')
  ),
  prioridade text not null default 'media' check (prioridade in ('critica', 'alta', 'media', 'baixa')),
  prazo_at timestamptz,
  origem text not null default 'manual',
  origem_id text,
  origem_hash text,
  payload jsonb not null default '{}'::jsonb,
  criado_por uuid references security.usuarios(id) on delete set null,
  atualizado_por uuid references security.usuarios(id) on delete set null,
  concluido_por uuid references security.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  concluded_at timestamptz
);

create unique index if not exists gkit_jur_tarefas_origem_hash_unique
  on gkit_jur.tarefas(origem, origem_hash)
  where origem_hash is not null;

create index if not exists idx_gkit_jur_tarefas_processo_status
  on gkit_jur.tarefas(processo_id, status, prazo_at);
create index if not exists idx_gkit_jur_tarefas_carteira_status
  on gkit_jur.tarefas(carteira_id, status, prazo_at);
create index if not exists idx_gkit_jur_tarefas_responsavel_status
  on gkit_jur.tarefas(responsavel_id, status, prazo_at);
create index if not exists idx_gkit_jur_tarefas_abertas_prazo
  on gkit_jur.tarefas(status, prazo_at, prioridade)
  where status in ('aberta', 'em_andamento', 'aguardando_terceiro');

alter table gkit_jur.tarefas enable row level security;

drop policy if exists tarefas_read_scope on gkit_jur.tarefas;
create policy tarefas_read_scope on gkit_jur.tarefas
  for select to authenticated
  using (
    (select security.is_admin_global())
    or (
      security.usuario_tem_permissao('gkit_jur.tarefas.read')
      and (
        carteira_id is null
        or security.usuario_tem_carteira(carteira_id)
        or exists (
          select 1
          from gkit_jur.processos p
          where p.id = tarefas.processo_id
            and (p.carteira_id is null or security.usuario_tem_carteira(p.carteira_id))
        )
      )
    )
  );

drop policy if exists tarefas_write_scope on gkit_jur.tarefas;
create policy tarefas_write_scope on gkit_jur.tarefas
  for all to authenticated
  using (
    (select security.is_admin_global())
    or (
      security.usuario_tem_permissao('gkit_jur.tarefas.write')
      and (
        carteira_id is null
        or security.usuario_tem_carteira(carteira_id)
        or exists (
          select 1
          from gkit_jur.processos p
          where p.id = tarefas.processo_id
            and (p.carteira_id is null or security.usuario_tem_carteira(p.carteira_id))
        )
      )
    )
  )
  with check (
    (select security.is_admin_global())
    or (
      security.usuario_tem_permissao('gkit_jur.tarefas.write')
      and (
        carteira_id is null
        or security.usuario_tem_carteira(carteira_id)
        or exists (
          select 1
          from gkit_jur.processos p
          where p.id = tarefas.processo_id
            and (p.carteira_id is null or security.usuario_tem_carteira(p.carteira_id))
        )
      )
    )
  );

grant usage on schema gkit_jur to authenticated, service_role;
grant select on gkit_jur.tarefas to authenticated;
grant select, insert, update, delete on gkit_jur.tarefas to service_role;

with rows(codigo, nome, descricao, recurso, acao, sistema, status) as (
  values
    ('gkit_jur.tarefas.read', 'GKIT Jur - ler tarefas', 'Consultar tarefas juridicas vinculadas aos processos.', 'gkit_jur.tarefas', 'read', true, 'ativo'),
    ('gkit_jur.tarefas.write', 'GKIT Jur - gravar tarefas', 'Criar e atualizar tarefas juridicas vinculadas aos processos.', 'gkit_jur.tarefas', 'write', true, 'ativo')
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

comment on table gkit_jur.tarefas is 'Tarefas operacionais juridicas vinculadas a processos, criadas manualmente ou por integracoes futuras.';
comment on column gkit_jur.tarefas.origem_hash is 'Chave de idempotencia para impedir duplicidade quando uma integracao reenviar o mesmo evento.';

notify pgrst, 'reload schema';

commit;
