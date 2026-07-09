create table if not exists gkit_jur.acordos_judiciais (
  id uuid primary key default gen_random_uuid(),
  processo_id uuid not null references gkit_jur.processos(id) on delete cascade,
  valor_total numeric(14,2) not null check (valor_total > 0),
  quantidade_parcelas integer not null check (quantidade_parcelas > 0 and quantidade_parcelas <= 240),
  dia_vencimento integer not null check (dia_vencimento between 1 and 31),
  primeiro_vencimento date not null,
  status text not null default 'ativo' check (status in ('ativo', 'cumprido', 'quebrado', 'cancelado')),
  observacoes text,
  criado_por uuid references security.usuarios(id) on delete set null,
  atualizado_por uuid references security.usuarios(id) on delete set null,
  quebrado_em timestamptz,
  quitado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists gkit_jur.acordo_parcelas (
  id uuid primary key default gen_random_uuid(),
  acordo_id uuid not null references gkit_jur.acordos_judiciais(id) on delete cascade,
  numero integer not null check (numero > 0),
  valor numeric(14,2) not null check (valor >= 0),
  vencimento date not null,
  status text not null default 'pendente' check (status in ('pendente', 'paga', 'cancelada')),
  pago_em timestamptz,
  valor_pago numeric(14,2),
  observacoes text,
  atualizado_por uuid references security.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gkit_jur_acordo_parcelas_unique unique (acordo_id, numero)
);

create index if not exists idx_gkit_jur_acordos_processo_status
  on gkit_jur.acordos_judiciais(processo_id, status);

create index if not exists idx_gkit_jur_acordos_status_updated
  on gkit_jur.acordos_judiciais(status, updated_at desc);

create index if not exists idx_gkit_jur_acordo_parcelas_vencimento
  on gkit_jur.acordo_parcelas(status, vencimento);

create index if not exists idx_gkit_jur_acordo_parcelas_acordo
  on gkit_jur.acordo_parcelas(acordo_id, numero);

alter table gkit_jur.acordos_judiciais enable row level security;
alter table gkit_jur.acordo_parcelas enable row level security;

drop policy if exists acordos_judiciais_read_scope on gkit_jur.acordos_judiciais;
create policy acordos_judiciais_read_scope on gkit_jur.acordos_judiciais
  for select to authenticated
  using (
    exists (
      select 1
      from gkit_jur.processos p
      where p.id = acordos_judiciais.processo_id
        and (
          (select security.is_admin_global())
          or (
            security.usuario_tem_permissao('gkit_jur.processos.read')
            and (p.carteira_id is null or security.usuario_tem_carteira(p.carteira_id))
          )
        )
    )
  );

drop policy if exists acordos_judiciais_write_scope on gkit_jur.acordos_judiciais;
create policy acordos_judiciais_write_scope on gkit_jur.acordos_judiciais
  for all to authenticated
  using (
    exists (
      select 1
      from gkit_jur.processos p
      where p.id = acordos_judiciais.processo_id
        and (
          (select security.is_admin_global())
          or (
            security.usuario_tem_permissao('gkit_jur.processos.write')
            and (p.carteira_id is null or security.usuario_tem_carteira(p.carteira_id))
          )
        )
    )
  )
  with check (
    exists (
      select 1
      from gkit_jur.processos p
      where p.id = acordos_judiciais.processo_id
        and (
          (select security.is_admin_global())
          or (
            security.usuario_tem_permissao('gkit_jur.processos.write')
            and (p.carteira_id is null or security.usuario_tem_carteira(p.carteira_id))
          )
        )
    )
  );

drop policy if exists acordo_parcelas_read_scope on gkit_jur.acordo_parcelas;
create policy acordo_parcelas_read_scope on gkit_jur.acordo_parcelas
  for select to authenticated
  using (
    exists (
      select 1
      from gkit_jur.acordos_judiciais a
      join gkit_jur.processos p on p.id = a.processo_id
      where a.id = acordo_parcelas.acordo_id
        and (
          (select security.is_admin_global())
          or (
            security.usuario_tem_permissao('gkit_jur.processos.read')
            and (p.carteira_id is null or security.usuario_tem_carteira(p.carteira_id))
          )
        )
    )
  );

drop policy if exists acordo_parcelas_write_scope on gkit_jur.acordo_parcelas;
create policy acordo_parcelas_write_scope on gkit_jur.acordo_parcelas
  for all to authenticated
  using (
    exists (
      select 1
      from gkit_jur.acordos_judiciais a
      join gkit_jur.processos p on p.id = a.processo_id
      where a.id = acordo_parcelas.acordo_id
        and (
          (select security.is_admin_global())
          or (
            security.usuario_tem_permissao('gkit_jur.processos.write')
            and (p.carteira_id is null or security.usuario_tem_carteira(p.carteira_id))
          )
        )
    )
  )
  with check (
    exists (
      select 1
      from gkit_jur.acordos_judiciais a
      join gkit_jur.processos p on p.id = a.processo_id
      where a.id = acordo_parcelas.acordo_id
        and (
          (select security.is_admin_global())
          or (
            security.usuario_tem_permissao('gkit_jur.processos.write')
            and (p.carteira_id is null or security.usuario_tem_carteira(p.carteira_id))
          )
        )
    )
  );

grant usage on schema gkit_jur to authenticated, service_role;
grant select, insert, update, delete on gkit_jur.acordos_judiciais, gkit_jur.acordo_parcelas to authenticated;
grant select, insert, update, delete on gkit_jur.acordos_judiciais, gkit_jur.acordo_parcelas to service_role;

comment on table gkit_jur.acordos_judiciais is 'Acordos judiciais firmados em processos monitorados.';
comment on table gkit_jur.acordo_parcelas is 'Parcelas financeiras de acordos judiciais.';
