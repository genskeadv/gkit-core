create table if not exists ciclo.atendimentos_consultivos (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  astrea_codigo text,
  titulo text not null,
  cliente_nome text not null,
  cliente_id uuid references ciclo.clientes(id) on delete set null,
  carteira_id uuid references core.carteiras(id) on delete set null,
  responsavel text,
  etiquetas text[] not null default '{}',
  tipo_atendimento text not null default 'Sem etiqueta',
  status text not null default 'aberto' check (status in ('aberto', 'encerrado')),
  data_criacao date,
  data_encerramento timestamptz,
  data_ultimo_historico date,
  objeto text,
  ultimo_historico text,
  url_processo text,
  raw jsonb not null default '{}'::jsonb,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists atendimentos_consultivos_cliente_idx
  on ciclo.atendimentos_consultivos (cliente_nome);

create index if not exists atendimentos_consultivos_cliente_id_idx
  on ciclo.atendimentos_consultivos (cliente_id);

create index if not exists atendimentos_consultivos_carteira_id_idx
  on ciclo.atendimentos_consultivos (carteira_id);

create index if not exists atendimentos_consultivos_responsavel_idx
  on ciclo.atendimentos_consultivos (responsavel);

create index if not exists atendimentos_consultivos_tipo_idx
  on ciclo.atendimentos_consultivos (tipo_atendimento);

create index if not exists atendimentos_consultivos_status_idx
  on ciclo.atendimentos_consultivos (status);

create index if not exists atendimentos_consultivos_data_criacao_idx
  on ciclo.atendimentos_consultivos (data_criacao);

alter table ciclo.atendimentos_consultivos enable row level security;

notify pgrst, 'reload schema';
