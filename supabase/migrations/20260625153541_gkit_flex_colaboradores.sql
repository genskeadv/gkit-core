begin;

create table if not exists public.gkit_flex_colaboradores (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references security.usuarios(id) on delete restrict,
  carteira_id uuid references core.carteiras(id) on delete set null,
  gestor_usuario_id uuid references security.usuarios(id) on delete set null,
  cargo_operacional text,
  documento text,
  telefone text,
  chave_pix text,
  banco text,
  agencia text,
  conta text,
  tipo_conta text,
  data_inicio date,
  status text not null default 'ativo' check (status in ('ativo', 'inativo', 'afastado', 'encerrado')),
  salario numeric(14,2) not null default 0,
  participacao_honorarios numeric(14,2) not null default 0,
  pro_labore numeric(14,2) not null default 0,
  ajuda_custo numeric(14,2) not null default 0,
  outros_vencimentos numeric(14,2) not null default 0,
  beneficio_descricao text,
  beneficio_valor numeric(14,2) not null default 0,
  recebe_salario boolean not null default false,
  recebe_participacao_honorarios boolean not null default false,
  recebe_pro_labore boolean not null default false,
  recebe_beneficios boolean not null default false,
  recebe_outros boolean not null default false,
  recebe_comissoes boolean not null default true,
  observacoes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (usuario_id)
);

create index if not exists idx_gkit_flex_colaboradores_usuario
  on public.gkit_flex_colaboradores(usuario_id);

create index if not exists idx_gkit_flex_colaboradores_carteira
  on public.gkit_flex_colaboradores(carteira_id);

create index if not exists idx_gkit_flex_colaboradores_gestor
  on public.gkit_flex_colaboradores(gestor_usuario_id);

create index if not exists idx_gkit_flex_colaboradores_status
  on public.gkit_flex_colaboradores(status);

alter table public.gkit_flex_colaboradores enable row level security;

grant select, insert, update, delete on public.gkit_flex_colaboradores to service_role;

comment on table public.gkit_flex_colaboradores is
  'Complemento financeiro e operacional de usuarios Core usados pelo GKIT Flex e pela integracao com Colab.';
comment on column public.gkit_flex_colaboradores.usuario_id is
  'Usuario Core associado ao colaborador.';
comment on column public.gkit_flex_colaboradores.carteira_id is
  'Carteira Core principal do colaborador.';
comment on column public.gkit_flex_colaboradores.recebe_comissoes is
  'Indica se o colaborador participa da geracao de comissoes.';

with rows(codigo, nome, descricao, recurso, acao, sistema, status) as (
  values
    ('gkit_flex.colaboradores.read', 'GKIT Flex - ler colaboradores', 'Consultar complementos financeiros de colaboradores.', 'gkit_flex.colaboradores', 'read', true, 'ativo'),
    ('gkit_flex.colaboradores.write', 'GKIT Flex - gravar colaboradores', 'Gerenciar complementos financeiros de colaboradores.', 'gkit_flex.colaboradores', 'write', true, 'ativo')
)
insert into security.permissoes (codigo, nome, descricao, app_id, recurso, acao, sistema, status)
select rows.codigo, rows.nome, rows.descricao, apps.id, rows.recurso, rows.acao, rows.sistema, rows.status::core.status_registro
from rows
left join core.apps apps on apps.codigo = 'gkit_flex'
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
