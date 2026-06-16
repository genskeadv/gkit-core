create table if not exists ciclo.onboarding_workflow_atividades (
  id uuid primary key default gen_random_uuid(),
  ordem integer not null default 0,
  descricao text not null,
  responsavel_padrao text,
  obrigatoria boolean not null default true,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists onboarding_workflow_atividades_ordem_idx
  on ciclo.onboarding_workflow_atividades (ordem);

create table if not exists ciclo.onboarding_cliente_atividades (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references ciclo.clientes(id) on delete cascade,
  carteira_id uuid references core.carteiras(id) on delete set null,
  atividade_id uuid references ciclo.onboarding_workflow_atividades(id) on delete set null,
  ordem integer not null default 0,
  descricao text not null,
  responsavel text,
  status text not null default 'pendente'
    check (status in ('pendente', 'em_andamento', 'concluido', 'dispensado')),
  obrigatoria boolean not null default true,
  concluido_em timestamptz,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists onboarding_cliente_atividades_cliente_atividade_idx
  on ciclo.onboarding_cliente_atividades (cliente_id, atividade_id)
  where atividade_id is not null;

create index if not exists onboarding_cliente_atividades_cliente_idx
  on ciclo.onboarding_cliente_atividades (cliente_id, ordem);

create index if not exists onboarding_cliente_atividades_status_idx
  on ciclo.onboarding_cliente_atividades (status);

alter table ciclo.onboarding_workflow_atividades enable row level security;
alter table ciclo.onboarding_cliente_atividades enable row level security;

insert into ciclo.onboarding_workflow_atividades (ordem, descricao, responsavel_padrao, obrigatoria, ativo)
values
  (10, 'Elaborar contrato', null, true, true),
  (20, 'Acompanhar assinatura do contrato', null, true, true),
  (30, 'Enviar kit boas vindas', null, true, true),
  (40, 'Criar cliente nos sistemas: ASTREA / OMIE / CICLO', null, true, true),
  (50, 'Atribuir carteira', null, true, true),
  (60, 'Fazer o inventario dos processos', null, true, true),
  (70, 'Realizar reuniao de recepcao do cliente', null, true, true),
  (80, 'Apresentar equipe ao cliente', null, true, true),
  (90, 'Incluir advogados nos grupos de WhatsApp', null, true, true),
  (100, 'Iniciar workflow de documentacao', null, true, true),
  (110, 'Realizar reuniao de alinhamento de cobranca', null, true, true),
  (120, 'Enviar video de apresentacao', null, true, true)
on conflict (ordem) do update
set
  descricao = excluded.descricao,
  updated_at = now();

notify pgrst, 'reload schema';
