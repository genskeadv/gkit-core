begin;

create table if not exists core.times (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text generated always as (
    lower(regexp_replace(trim(nome), '[^a-zA-Z0-9]+', '_', 'g'))
  ) stored,
  descricao text,
  area text,
  status core.status_registro not null default 'ativo',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (slug)
);

create table if not exists core.carteira_colaboradores (
  id uuid primary key default gen_random_uuid(),
  carteira_id uuid not null references core.carteiras(id) on delete cascade,
  usuario_id uuid not null references security.usuarios(id) on delete cascade,
  papel text,
  principal boolean not null default false,
  ativo boolean not null default true,
  data_inicio date,
  data_fim date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (carteira_id, usuario_id)
);

create table if not exists core.time_colaboradores (
  id uuid primary key default gen_random_uuid(),
  time_id uuid not null references core.times(id) on delete cascade,
  usuario_id uuid not null references security.usuarios(id) on delete cascade,
  papel text,
  principal boolean not null default false,
  ativo boolean not null default true,
  data_inicio date,
  data_fim date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (time_id, usuario_id)
);

create index if not exists idx_core_carteira_colaboradores_carteira
  on core.carteira_colaboradores(carteira_id);
create index if not exists idx_core_carteira_colaboradores_usuario
  on core.carteira_colaboradores(usuario_id);
create index if not exists idx_core_time_colaboradores_time
  on core.time_colaboradores(time_id);
create index if not exists idx_core_time_colaboradores_usuario
  on core.time_colaboradores(usuario_id);
create index if not exists idx_core_times_status
  on core.times(status);

alter table core.times enable row level security;
alter table core.carteira_colaboradores enable row level security;
alter table core.time_colaboradores enable row level security;

drop policy if exists times_select_admin_or_member on core.times;
create policy times_select_admin_or_member on core.times
  for select to authenticated
  using (
    (select security.is_admin_global())
    or security.usuario_tem_permissao('admin.times.read')
    or exists (
      select 1
      from core.time_colaboradores tc
      where tc.time_id = times.id
        and tc.usuario_id = (select auth.uid())
        and tc.ativo
    )
  );

drop policy if exists times_admin_insert on core.times;
create policy times_admin_insert on core.times
  for insert to authenticated
  with check ((select security.is_admin_global()) or security.usuario_tem_permissao('admin.times.write'));

drop policy if exists times_admin_update on core.times;
create policy times_admin_update on core.times
  for update to authenticated
  using ((select security.is_admin_global()) or security.usuario_tem_permissao('admin.times.write'))
  with check ((select security.is_admin_global()) or security.usuario_tem_permissao('admin.times.write'));

drop policy if exists times_admin_delete on core.times;
create policy times_admin_delete on core.times
  for delete to authenticated
  using ((select security.is_admin_global()) or security.usuario_tem_permissao('admin.times.write'));

drop policy if exists carteira_colaboradores_select_admin_or_member on core.carteira_colaboradores;
create policy carteira_colaboradores_select_admin_or_member on core.carteira_colaboradores
  for select to authenticated
  using (
    (select security.is_admin_global())
    or security.usuario_tem_permissao('admin.carteiras.read')
    or usuario_id = (select auth.uid())
  );

drop policy if exists carteira_colaboradores_admin_insert on core.carteira_colaboradores;
create policy carteira_colaboradores_admin_insert on core.carteira_colaboradores
  for insert to authenticated
  with check ((select security.is_admin_global()) or security.usuario_tem_permissao('admin.carteiras.write'));

drop policy if exists carteira_colaboradores_admin_update on core.carteira_colaboradores;
create policy carteira_colaboradores_admin_update on core.carteira_colaboradores
  for update to authenticated
  using ((select security.is_admin_global()) or security.usuario_tem_permissao('admin.carteiras.write'))
  with check ((select security.is_admin_global()) or security.usuario_tem_permissao('admin.carteiras.write'));

drop policy if exists carteira_colaboradores_admin_delete on core.carteira_colaboradores;
create policy carteira_colaboradores_admin_delete on core.carteira_colaboradores
  for delete to authenticated
  using ((select security.is_admin_global()) or security.usuario_tem_permissao('admin.carteiras.write'));

drop policy if exists time_colaboradores_select_admin_or_member on core.time_colaboradores;
create policy time_colaboradores_select_admin_or_member on core.time_colaboradores
  for select to authenticated
  using (
    (select security.is_admin_global())
    or security.usuario_tem_permissao('admin.times.read')
    or usuario_id = (select auth.uid())
  );

drop policy if exists time_colaboradores_admin_insert on core.time_colaboradores;
create policy time_colaboradores_admin_insert on core.time_colaboradores
  for insert to authenticated
  with check ((select security.is_admin_global()) or security.usuario_tem_permissao('admin.times.write'));

drop policy if exists time_colaboradores_admin_update on core.time_colaboradores;
create policy time_colaboradores_admin_update on core.time_colaboradores
  for update to authenticated
  using ((select security.is_admin_global()) or security.usuario_tem_permissao('admin.times.write'))
  with check ((select security.is_admin_global()) or security.usuario_tem_permissao('admin.times.write'));

drop policy if exists time_colaboradores_admin_delete on core.time_colaboradores;
create policy time_colaboradores_admin_delete on core.time_colaboradores
  for delete to authenticated
  using ((select security.is_admin_global()) or security.usuario_tem_permissao('admin.times.write'));

grant select on core.times, core.carteira_colaboradores, core.time_colaboradores to authenticated;
grant select, insert, update, delete on core.times, core.carteira_colaboradores, core.time_colaboradores to service_role;

with rows(codigo, nome, descricao, recurso, acao, sistema, status) as (
  values
    ('admin.times.read', 'Ver times', 'Consultar times operacionais do Core.', 'admin.times', 'read', true, 'ativo'),
    ('admin.times.write', 'Gerenciar times', 'Criar e manter times operacionais do Core.', 'admin.times', 'write', true, 'ativo')
)
insert into security.permissoes (codigo, nome, descricao, app_id, recurso, acao, sistema, status)
select rows.codigo, rows.nome, rows.descricao, null, rows.recurso, rows.acao, rows.sistema, rows.status::core.status_registro
from rows
on conflict (codigo) do update
set
  nome = excluded.nome,
  descricao = excluded.descricao,
  recurso = excluded.recurso,
  acao = excluded.acao,
  sistema = excluded.sistema,
  status = excluded.status;

insert into core.carteira_colaboradores (carteira_id, usuario_id, principal, ativo, metadata)
select distinct c.carteira_id, c.usuario_id, true, true, jsonb_build_object('origem', 'gkit_flex_colaboradores')
from public.gkit_flex_colaboradores c
where c.carteira_id is not null
on conflict (carteira_id, usuario_id) do update
set
  ativo = true,
  principal = core.carteira_colaboradores.principal or excluded.principal,
  metadata = core.carteira_colaboradores.metadata || excluded.metadata,
  updated_at = now();

insert into core.times (nome, descricao, area, status, metadata)
values
  ('Contencioso', 'Time juridico responsavel pela conducao contenciosa.', 'juridico', 'ativo', '{"origem":"seed_core"}'::jsonb),
  ('Cobranca', 'Time responsavel por cobranca e recuperacao.', 'operacao', 'ativo', '{"origem":"seed_core"}'::jsonb),
  ('Administrativo', 'Time administrativo e financeiro.', 'administrativo', 'ativo', '{"origem":"seed_core"}'::jsonb)
on conflict (slug) do nothing;

create or replace view security.v_carteiras_admin
with (security_invoker = true) as
select
  c.id,
  c.nome,
  c.nome_normalizado,
  c.descricao,
  c.logo_url,
  c.cor_primaria,
  c.status,
  c.created_at,
  c.updated_at,
  count(distinct uc.usuario_id) filter (where uc.ativo) as total_usuarios_ativos,
  count(distinct cc.usuario_id) filter (where cc.ativo) as total_colaboradores
from core.carteiras c
left join security.usuario_carteiras uc on uc.carteira_id = c.id
left join core.carteira_colaboradores cc on cc.carteira_id = c.id
group by c.id;

create or replace view security.v_times_admin
with (security_invoker = true) as
select
  t.id,
  t.nome,
  t.slug,
  t.descricao,
  t.area,
  t.status,
  t.created_at,
  t.updated_at,
  count(distinct tc.usuario_id) filter (where tc.ativo) as total_colaboradores
from core.times t
left join core.time_colaboradores tc on tc.time_id = t.id
group by t.id;

grant select on security.v_carteiras_admin, security.v_times_admin to authenticated, service_role;

comment on table core.times is 'Times organizacionais/areas internas, independentes das carteiras de clientes.';
comment on table core.carteira_colaboradores is 'Vinculo entre colaboradores e carteira de clientes/receita.';
comment on table core.time_colaboradores is 'Vinculo entre colaboradores e times/areas organizacionais.';
comment on column core.carteira_colaboradores.principal is 'Indica a carteira principal do colaborador quando houver mais de uma.';
comment on column core.time_colaboradores.principal is 'Indica o time principal do colaborador quando houver mais de um.';

notify pgrst, 'reload schema';

commit;
