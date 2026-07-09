create table if not exists gkit_jur.etiquetas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cor text not null default '#64748b',
  ativo boolean not null default true,
  criado_por uuid references security.usuarios(id) on delete set null,
  atualizado_por uuid references security.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gkit_jur_etiquetas_nome_unique unique (nome),
  constraint gkit_jur_etiquetas_nome_not_blank check (length(btrim(nome)) > 0),
  constraint gkit_jur_etiquetas_cor_hex check (cor ~ '^#[0-9A-Fa-f]{6}$')
);

create table if not exists gkit_jur.processo_etiquetas (
  processo_id uuid not null references gkit_jur.processos(id) on delete cascade,
  etiqueta_id uuid not null references gkit_jur.etiquetas(id) on delete cascade,
  criado_por uuid references security.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (processo_id, etiqueta_id)
);

create index if not exists idx_gkit_jur_etiquetas_ativo_nome
  on gkit_jur.etiquetas(ativo, nome);

create index if not exists idx_gkit_jur_processo_etiquetas_etiqueta
  on gkit_jur.processo_etiquetas(etiqueta_id, processo_id);

alter table gkit_jur.etiquetas enable row level security;
alter table gkit_jur.processo_etiquetas enable row level security;

drop policy if exists etiquetas_read_scope on gkit_jur.etiquetas;
create policy etiquetas_read_scope on gkit_jur.etiquetas
  for select to authenticated
  using (
    (select security.is_admin_global())
    or security.usuario_tem_permissao('gkit_jur.processos.read')
    or security.usuario_tem_permissao('gkit_jur.admin.read')
  );

drop policy if exists etiquetas_write_scope on gkit_jur.etiquetas;
create policy etiquetas_write_scope on gkit_jur.etiquetas
  for all to authenticated
  using ((select security.is_admin_global()) or security.usuario_tem_permissao('gkit_jur.admin.write'))
  with check ((select security.is_admin_global()) or security.usuario_tem_permissao('gkit_jur.admin.write'));

drop policy if exists processo_etiquetas_read_scope on gkit_jur.processo_etiquetas;
create policy processo_etiquetas_read_scope on gkit_jur.processo_etiquetas
  for select to authenticated
  using (
    exists (
      select 1
      from gkit_jur.processos p
      where p.id = processo_etiquetas.processo_id
        and (
          (select security.is_admin_global())
          or (
            security.usuario_tem_permissao('gkit_jur.processos.read')
            and (p.carteira_id is null or security.usuario_tem_carteira(p.carteira_id))
          )
        )
    )
  );

drop policy if exists processo_etiquetas_write_scope on gkit_jur.processo_etiquetas;
create policy processo_etiquetas_write_scope on gkit_jur.processo_etiquetas
  for all to authenticated
  using (
    exists (
      select 1
      from gkit_jur.processos p
      where p.id = processo_etiquetas.processo_id
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
      where p.id = processo_etiquetas.processo_id
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
grant select on gkit_jur.etiquetas, gkit_jur.processo_etiquetas to authenticated;
grant insert, update, delete on gkit_jur.etiquetas, gkit_jur.processo_etiquetas to authenticated;
grant select, insert, update, delete on gkit_jur.etiquetas, gkit_jur.processo_etiquetas to service_role;

comment on table gkit_jur.etiquetas is 'Etiquetas configuraveis para classificar processos juridicos.';
comment on table gkit_jur.processo_etiquetas is 'Associacao N:N entre processos juridicos e etiquetas operacionais.';
