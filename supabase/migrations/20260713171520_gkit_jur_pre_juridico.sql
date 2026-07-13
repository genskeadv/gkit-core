create table if not exists gkit_jur.pre_juridicos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  cliente_id uuid references ciclo.clientes(id) on delete set null,
  cliente_nome text,
  descricao text not null,
  carteira_id uuid references core.carteiras(id) on delete set null,
  responsavel_id uuid references security.usuarios(id) on delete set null,
  origem text,
  area text,
  valor_estimado numeric(14,2),
  probabilidade text not null default 'media',
  prioridade text not null default 'media',
  status text not null default 'em_analise',
  motivo_status text,
  data_entrada date not null default current_date,
  prazo_analise date,
  convertido_processo_id uuid references gkit_jur.processos(id) on delete set null,
  convertido_em timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  criado_por uuid references security.usuarios(id) on delete set null,
  atualizado_por uuid references security.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pre_juridicos_status_check check (status in ('em_analise', 'aguardando_documentos', 'aprovado', 'descartado', 'convertido')),
  constraint pre_juridicos_prioridade_check check (prioridade in ('baixa', 'media', 'alta', 'critica')),
  constraint pre_juridicos_probabilidade_check check (probabilidade in ('baixa', 'media', 'alta')),
  constraint pre_juridicos_conversao_check check (
    (status = 'convertido' and convertido_processo_id is not null and convertido_em is not null)
    or status <> 'convertido'
  )
);

create index if not exists pre_juridicos_cliente_idx on gkit_jur.pre_juridicos(cliente_id);
create index if not exists pre_juridicos_carteira_idx on gkit_jur.pre_juridicos(carteira_id);
create index if not exists pre_juridicos_responsavel_idx on gkit_jur.pre_juridicos(responsavel_id);
create index if not exists pre_juridicos_status_idx on gkit_jur.pre_juridicos(status);
create index if not exists pre_juridicos_updated_idx on gkit_jur.pre_juridicos(updated_at desc);

alter table gkit_jur.pre_juridicos enable row level security;

drop policy if exists pre_juridicos_read on gkit_jur.pre_juridicos;
create policy pre_juridicos_read on gkit_jur.pre_juridicos
  for select
  using (
    security.usuario_tem_permissao('gkit_jur.processos.read')
    and (
      carteira_id is null
      or security.usuario_tem_carteira(carteira_id)
      or security.usuario_tem_permissao('gkit_jur.admin.read')
    )
  );

drop policy if exists pre_juridicos_insert on gkit_jur.pre_juridicos;
create policy pre_juridicos_insert on gkit_jur.pre_juridicos
  for insert
  with check (
    security.usuario_tem_permissao('gkit_jur.processos.write')
    and (
      carteira_id is null
      or security.usuario_tem_carteira(carteira_id)
      or security.usuario_tem_permissao('gkit_jur.admin.write')
    )
  );

drop policy if exists pre_juridicos_update on gkit_jur.pre_juridicos;
create policy pre_juridicos_update on gkit_jur.pre_juridicos
  for update
  using (
    security.usuario_tem_permissao('gkit_jur.processos.write')
    and (
      carteira_id is null
      or security.usuario_tem_carteira(carteira_id)
      or security.usuario_tem_permissao('gkit_jur.admin.write')
    )
  )
  with check (
    security.usuario_tem_permissao('gkit_jur.processos.write')
    and (
      carteira_id is null
      or security.usuario_tem_carteira(carteira_id)
      or security.usuario_tem_permissao('gkit_jur.admin.write')
    )
  );

grant select on table gkit_jur.pre_juridicos to authenticated;
grant select, insert, update, delete on table gkit_jur.pre_juridicos to service_role;

comment on table gkit_jur.pre_juridicos is 'Casos em analise antes de virarem processos judiciais no GKIT Jur.';
comment on column gkit_jur.pre_juridicos.convertido_processo_id is 'Processo gerado a partir do pre-juridico, quando houver conversao operacional.';

notify pgrst, 'reload schema';
