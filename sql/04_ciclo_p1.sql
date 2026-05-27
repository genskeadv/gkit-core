-- GKLI Core - P1 Ciclo
-- Execute depois do bootstrap do Core. No Supabase, exponha tambem o schema `ciclo`.

create schema if not exists ciclo;
create extension if not exists pgcrypto;

do $$ begin
  create type ciclo.status_cliente as enum ('novo', 'implantacao', 'ativo', 'pausado', 'encerrado');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type ciclo.risco_cliente as enum ('baixo', 'medio', 'alto', 'critico');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type ciclo.temperatura_cliente as enum ('quente', 'neutro', 'frio');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type ciclo.status_documento as enum ('pendente', 'recebido', 'validado', 'vencido', 'dispensado');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type ciclo.status_alerta as enum ('aberto', 'em_tratamento', 'resolvido', 'cancelado');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type ciclo.severidade_alerta as enum ('baixa', 'media', 'alta', 'critica');
exception when duplicate_object then null;
end $$;

create table if not exists ciclo.administradoras (
  id uuid default gen_random_uuid() not null,
  nome text not null,
  nome_normalizado text generated always as (core.normalize_text(nome)) stored,
  documento text,
  email text,
  telefone text,
  site text,
  observacoes text,
  ativo boolean default true not null,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint administradoras_pkey primary key (id),
  constraint administradoras_nome_len check (char_length(trim(nome)) between 2 and 180)
);

create table if not exists ciclo.clientes (
  id uuid default gen_random_uuid() not null,
  carteira_id uuid,
  administradora_id uuid,
  nome text not null,
  nome_fantasia text,
  razao_social text,
  documento text,
  cnpj_normalizado text generated always as (core.only_digits(documento)) stored,
  email text,
  telefone text,
  cidade text,
  estado text,
  status_operacional ciclo.status_cliente default 'ativo'::ciclo.status_cliente not null,
  score_atual integer default 75 not null,
  risco_atual ciclo.risco_cliente default 'medio'::ciclo.risco_cliente not null,
  temperatura ciclo.temperatura_cliente default 'neutro'::ciclo.temperatura_cliente not null,
  pasta_url text,
  observacoes text,
  ativo boolean default true not null,
  metadata jsonb default '{}'::jsonb not null,
  ultimo_movimento_em timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint clientes_pkey primary key (id),
  constraint clientes_nome_len check (char_length(trim(nome)) between 2 and 180),
  constraint clientes_score_check check (score_atual between 0 and 100)
);

create table if not exists ciclo.cliente_contatos (
  id uuid default gen_random_uuid() not null,
  cliente_id uuid not null,
  nome text not null,
  tipo text,
  cargo text,
  email text,
  telefone text,
  whatsapp text,
  principal boolean default false not null,
  ativo boolean default true not null,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint cliente_contatos_pkey primary key (id),
  constraint cliente_contatos_nome_len check (char_length(trim(nome)) between 2 and 180)
);

create table if not exists ciclo.regularidade_cliente (
  id uuid default gen_random_uuid() not null,
  cliente_id uuid not null,
  carteira_id uuid,
  percentual_regularidade integer default 0 not null,
  status text default 'atencao' not null,
  pendencias jsonb default '[]'::jsonb not null,
  atualizado_em timestamp with time zone default now() not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint regularidade_cliente_pkey primary key (id),
  constraint regularidade_cliente_cliente_id_key unique (cliente_id),
  constraint regularidade_percentual_check check (percentual_regularidade between 0 and 100)
);

create table if not exists ciclo.cliente_documentos (
  id uuid default gen_random_uuid() not null,
  cliente_id uuid not null,
  carteira_id uuid,
  tipo_documento text not null,
  titulo text,
  status ciclo.status_documento default 'pendente'::ciclo.status_documento not null,
  obrigatorio boolean default true not null,
  aplicavel boolean default true not null,
  validado boolean default false not null,
  validado_em timestamp with time zone,
  data_assinatura date,
  data_realizacao date,
  data_renovacao date,
  arquivo_url text,
  observacoes text,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint cliente_documentos_pkey primary key (id),
  constraint cliente_documentos_cliente_tipo_key unique (cliente_id, tipo_documento)
);

create table if not exists ciclo.alertas_cliente (
  id uuid default gen_random_uuid() not null,
  cliente_id uuid,
  carteira_id uuid,
  tipo text default 'operacional' not null,
  titulo text not null,
  descricao text,
  status ciclo.status_alerta default 'aberto'::ciclo.status_alerta not null,
  severidade ciclo.severidade_alerta default 'media'::ciclo.severidade_alerta not null,
  vencimento_em timestamp with time zone,
  origem text,
  referencia_id uuid,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint alertas_cliente_pkey primary key (id),
  constraint alertas_cliente_titulo_len check (char_length(trim(titulo)) between 2 and 180)
);

create table if not exists ciclo.timeline_cliente (
  id uuid default gen_random_uuid() not null,
  cliente_id uuid not null,
  carteira_id uuid,
  tipo text default 'evento' not null,
  titulo text not null,
  descricao text,
  usuario_id uuid,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  constraint timeline_cliente_pkey primary key (id),
  constraint timeline_cliente_titulo_len check (char_length(trim(titulo)) between 2 and 180)
);

create table if not exists ciclo.ocorrencias (
  id uuid default gen_random_uuid() not null,
  cliente_id uuid,
  carteira_id uuid,
  tipo text default 'operacional' not null,
  impacto text default 'neutro' not null,
  titulo text not null,
  descricao text,
  peso integer default 1 not null,
  impacto_score integer default 0 not null,
  data_ocorrencia date default current_date not null,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint ocorrencias_pkey primary key (id),
  constraint ocorrencias_titulo_len check (char_length(trim(titulo)) between 2 and 180)
);

create table if not exists ciclo.contratos (
  id uuid default gen_random_uuid() not null,
  cliente_id uuid,
  carteira_id uuid,
  numero_contrato text,
  data_assinatura date,
  data_inicio date,
  data_fim date,
  valor numeric(14,2),
  indice_reajuste text,
  proximo_reajuste date,
  status text default 'ativo' not null,
  ativo boolean default true not null,
  observacoes text,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint contratos_pkey primary key (id)
);

create table if not exists ciclo.atas (
  id uuid default gen_random_uuid() not null,
  cliente_id uuid,
  carteira_id uuid,
  tipo text,
  data_ata date,
  data_validade date,
  status text default 'vigente' not null,
  ativo boolean default true not null,
  observacoes text,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint atas_pkey primary key (id)
);

create table if not exists ciclo.importacao_lotes (
  id uuid default gen_random_uuid() not null,
  tipo text default 'clientes_xlsx' not null,
  status text default 'processando' not null,
  arquivo_nome text,
  arquivo_tamanho bigint,
  total_linhas integer default 0 not null,
  linhas_validas integer default 0 not null,
  clientes_criados integer default 0 not null,
  clientes_atualizados integer default 0 not null,
  contatos_importados integer default 0 not null,
  linhas_ignoradas integer default 0 not null,
  erro text,
  usuario_id uuid,
  carteira_ids uuid[] default '{}'::uuid[] not null,
  resumo jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  finalizado_em timestamp with time zone,
  constraint importacao_lotes_pkey primary key (id)
);

create table if not exists ciclo.importacao_lote_itens (
  id uuid default gen_random_uuid() not null,
  lote_id uuid not null,
  linha integer default 0 not null,
  carteira_id uuid,
  cliente_id uuid,
  acao text not null,
  status text not null,
  cnpj_normalizado text,
  cliente_nome text,
  mensagem text,
  payload jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  constraint importacao_lote_itens_pkey primary key (id)
);

do $$ begin
  alter table ciclo.clientes add constraint clientes_carteira_id_fkey foreign key (carteira_id) references core.carteiras(id) on delete set null;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table ciclo.clientes add constraint clientes_administradora_id_fkey foreign key (administradora_id) references ciclo.administradoras(id) on delete set null;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table ciclo.cliente_contatos add constraint cliente_contatos_cliente_id_fkey foreign key (cliente_id) references ciclo.clientes(id) on delete cascade;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table ciclo.regularidade_cliente add constraint regularidade_cliente_cliente_id_fkey foreign key (cliente_id) references ciclo.clientes(id) on delete cascade;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table ciclo.regularidade_cliente add constraint regularidade_cliente_carteira_id_fkey foreign key (carteira_id) references core.carteiras(id) on delete set null;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table ciclo.cliente_documentos add constraint cliente_documentos_cliente_id_fkey foreign key (cliente_id) references ciclo.clientes(id) on delete cascade;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table ciclo.cliente_documentos add constraint cliente_documentos_carteira_id_fkey foreign key (carteira_id) references core.carteiras(id) on delete set null;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table ciclo.alertas_cliente add constraint alertas_cliente_cliente_id_fkey foreign key (cliente_id) references ciclo.clientes(id) on delete cascade;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table ciclo.alertas_cliente add constraint alertas_cliente_carteira_id_fkey foreign key (carteira_id) references core.carteiras(id) on delete set null;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table ciclo.timeline_cliente add constraint timeline_cliente_cliente_id_fkey foreign key (cliente_id) references ciclo.clientes(id) on delete cascade;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table ciclo.timeline_cliente add constraint timeline_cliente_carteira_id_fkey foreign key (carteira_id) references core.carteiras(id) on delete set null;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table ciclo.timeline_cliente add constraint timeline_cliente_usuario_id_fkey foreign key (usuario_id) references security.usuarios(id) on delete set null;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table ciclo.ocorrencias add constraint ocorrencias_cliente_id_fkey foreign key (cliente_id) references ciclo.clientes(id) on delete cascade;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table ciclo.ocorrencias add constraint ocorrencias_carteira_id_fkey foreign key (carteira_id) references core.carteiras(id) on delete set null;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table ciclo.contratos add constraint contratos_cliente_id_fkey foreign key (cliente_id) references ciclo.clientes(id) on delete cascade;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table ciclo.contratos add constraint contratos_carteira_id_fkey foreign key (carteira_id) references core.carteiras(id) on delete set null;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table ciclo.atas add constraint atas_cliente_id_fkey foreign key (cliente_id) references ciclo.clientes(id) on delete cascade;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table ciclo.atas add constraint atas_carteira_id_fkey foreign key (carteira_id) references core.carteiras(id) on delete set null;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table ciclo.importacao_lotes add constraint importacao_lotes_usuario_id_fkey foreign key (usuario_id) references security.usuarios(id) on delete set null;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table ciclo.importacao_lote_itens add constraint importacao_lote_itens_lote_id_fkey foreign key (lote_id) references ciclo.importacao_lotes(id) on delete cascade;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table ciclo.importacao_lote_itens add constraint importacao_lote_itens_carteira_id_fkey foreign key (carteira_id) references core.carteiras(id) on delete set null;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table ciclo.importacao_lote_itens add constraint importacao_lote_itens_cliente_id_fkey foreign key (cliente_id) references ciclo.clientes(id) on delete set null;
exception when duplicate_object then null;
end $$;

drop trigger if exists trg_administradoras_updated_at on ciclo.administradoras;
create trigger trg_administradoras_updated_at before update on ciclo.administradoras for each row execute function core.set_updated_at();

drop trigger if exists trg_clientes_updated_at on ciclo.clientes;
create trigger trg_clientes_updated_at before update on ciclo.clientes for each row execute function core.set_updated_at();

drop trigger if exists trg_cliente_contatos_updated_at on ciclo.cliente_contatos;
create trigger trg_cliente_contatos_updated_at before update on ciclo.cliente_contatos for each row execute function core.set_updated_at();

drop trigger if exists trg_regularidade_cliente_updated_at on ciclo.regularidade_cliente;
create trigger trg_regularidade_cliente_updated_at before update on ciclo.regularidade_cliente for each row execute function core.set_updated_at();

drop trigger if exists trg_cliente_documentos_updated_at on ciclo.cliente_documentos;
create trigger trg_cliente_documentos_updated_at before update on ciclo.cliente_documentos for each row execute function core.set_updated_at();

drop trigger if exists trg_alertas_cliente_updated_at on ciclo.alertas_cliente;
create trigger trg_alertas_cliente_updated_at before update on ciclo.alertas_cliente for each row execute function core.set_updated_at();

drop trigger if exists trg_ocorrencias_updated_at on ciclo.ocorrencias;
create trigger trg_ocorrencias_updated_at before update on ciclo.ocorrencias for each row execute function core.set_updated_at();

drop trigger if exists trg_contratos_updated_at on ciclo.contratos;
create trigger trg_contratos_updated_at before update on ciclo.contratos for each row execute function core.set_updated_at();

drop trigger if exists trg_atas_updated_at on ciclo.atas;
create trigger trg_atas_updated_at before update on ciclo.atas for each row execute function core.set_updated_at();

create unique index if not exists clientes_cnpj_uidx on ciclo.clientes using btree (cnpj_normalizado) where cnpj_normalizado <> '';
create index if not exists clientes_carteira_id_idx on ciclo.clientes using btree (carteira_id);
create index if not exists clientes_administradora_id_idx on ciclo.clientes using btree (administradora_id);
create index if not exists clientes_risco_idx on ciclo.clientes using btree (risco_atual);
create index if not exists cliente_contatos_cliente_id_idx on ciclo.cliente_contatos using btree (cliente_id);
create index if not exists regularidade_cliente_cliente_id_idx on ciclo.regularidade_cliente using btree (cliente_id);
create index if not exists cliente_documentos_cliente_id_idx on ciclo.cliente_documentos using btree (cliente_id);
create index if not exists cliente_documentos_status_idx on ciclo.cliente_documentos using btree (status);
create index if not exists alertas_cliente_cliente_id_idx on ciclo.alertas_cliente using btree (cliente_id);
create index if not exists alertas_cliente_status_idx on ciclo.alertas_cliente using btree (status);
create index if not exists timeline_cliente_cliente_id_idx on ciclo.timeline_cliente using btree (cliente_id);
create index if not exists timeline_cliente_created_at_idx on ciclo.timeline_cliente using btree (created_at desc);
create index if not exists importacao_lotes_usuario_id_idx on ciclo.importacao_lotes using btree (usuario_id);
create index if not exists importacao_lotes_created_at_idx on ciclo.importacao_lotes using btree (created_at desc);
create index if not exists importacao_lote_itens_lote_id_idx on ciclo.importacao_lote_itens using btree (lote_id);

alter table ciclo.administradoras enable row level security;
alter table ciclo.clientes enable row level security;
alter table ciclo.cliente_contatos enable row level security;
alter table ciclo.regularidade_cliente enable row level security;
alter table ciclo.cliente_documentos enable row level security;
alter table ciclo.alertas_cliente enable row level security;
alter table ciclo.timeline_cliente enable row level security;
alter table ciclo.ocorrencias enable row level security;
alter table ciclo.contratos enable row level security;
alter table ciclo.atas enable row level security;
alter table ciclo.importacao_lotes enable row level security;
alter table ciclo.importacao_lote_itens enable row level security;

drop policy if exists administradoras_select_ciclo on ciclo.administradoras;
create policy administradoras_select_ciclo on ciclo.administradoras for select to authenticated using (security.usuario_tem_app('ciclo'));

drop policy if exists administradoras_write_ciclo on ciclo.administradoras;
create policy administradoras_write_ciclo on ciclo.administradoras for all to authenticated using (
  security.usuario_tem_permissao('ciclo.clientes.write')
) with check (
  security.usuario_tem_permissao('ciclo.clientes.write')
);

drop policy if exists clientes_select_ciclo_scope on ciclo.clientes;
create policy clientes_select_ciclo_scope on ciclo.clientes for select to authenticated using (
  security.usuario_tem_permissao('ciclo.clientes.read') and (carteira_id is null or security.usuario_tem_carteira(carteira_id))
);

drop policy if exists clientes_write_ciclo_scope on ciclo.clientes;
create policy clientes_write_ciclo_scope on ciclo.clientes for all to authenticated using (
  security.usuario_tem_permissao('ciclo.clientes.write') and (carteira_id is null or security.usuario_tem_carteira(carteira_id))
) with check (
  security.usuario_tem_permissao('ciclo.clientes.write') and (carteira_id is null or security.usuario_tem_carteira(carteira_id))
);

drop policy if exists cliente_contatos_select_ciclo_scope on ciclo.cliente_contatos;
create policy cliente_contatos_select_ciclo_scope on ciclo.cliente_contatos for select to authenticated using (
  security.usuario_tem_permissao('ciclo.clientes.read') and exists (
    select 1 from ciclo.clientes c
    where c.id = cliente_id
      and (c.carteira_id is null or security.usuario_tem_carteira(c.carteira_id))
  )
);

drop policy if exists cliente_contatos_write_ciclo on ciclo.cliente_contatos;
create policy cliente_contatos_write_ciclo on ciclo.cliente_contatos for all to authenticated using (
  security.usuario_tem_permissao('ciclo.clientes.write')
) with check (
  security.usuario_tem_permissao('ciclo.clientes.write')
);

drop policy if exists regularidade_select_ciclo_scope on ciclo.regularidade_cliente;
create policy regularidade_select_ciclo_scope on ciclo.regularidade_cliente for select to authenticated using (
  security.usuario_tem_permissao('ciclo.clientes.read') and (carteira_id is null or security.usuario_tem_carteira(carteira_id))
);

drop policy if exists regularidade_write_ciclo_scope on ciclo.regularidade_cliente;
create policy regularidade_write_ciclo_scope on ciclo.regularidade_cliente for all to authenticated using (
  security.usuario_tem_permissao('ciclo.clientes.write') and (carteira_id is null or security.usuario_tem_carteira(carteira_id))
) with check (
  security.usuario_tem_permissao('ciclo.clientes.write') and (carteira_id is null or security.usuario_tem_carteira(carteira_id))
);

drop policy if exists documentos_select_ciclo_scope on ciclo.cliente_documentos;
create policy documentos_select_ciclo_scope on ciclo.cliente_documentos for select to authenticated using (
  security.usuario_tem_permissao('ciclo.documentos.read') and (carteira_id is null or security.usuario_tem_carteira(carteira_id))
);

drop policy if exists documentos_write_ciclo_scope on ciclo.cliente_documentos;
create policy documentos_write_ciclo_scope on ciclo.cliente_documentos for all to authenticated using (
  security.usuario_tem_permissao('ciclo.documentos.write') and (carteira_id is null or security.usuario_tem_carteira(carteira_id))
) with check (
  security.usuario_tem_permissao('ciclo.documentos.write') and (carteira_id is null or security.usuario_tem_carteira(carteira_id))
);

drop policy if exists alertas_select_ciclo_scope on ciclo.alertas_cliente;
create policy alertas_select_ciclo_scope on ciclo.alertas_cliente for select to authenticated using (
  security.usuario_tem_permissao('ciclo.alertas.read') and (carteira_id is null or security.usuario_tem_carteira(carteira_id))
);

drop policy if exists alertas_write_ciclo_scope on ciclo.alertas_cliente;
create policy alertas_write_ciclo_scope on ciclo.alertas_cliente for all to authenticated using (
  security.usuario_tem_permissao('ciclo.alertas.write') and (carteira_id is null or security.usuario_tem_carteira(carteira_id))
) with check (
  security.usuario_tem_permissao('ciclo.alertas.write') and (carteira_id is null or security.usuario_tem_carteira(carteira_id))
);

drop policy if exists timeline_select_ciclo_scope on ciclo.timeline_cliente;
create policy timeline_select_ciclo_scope on ciclo.timeline_cliente for select to authenticated using (
  security.usuario_tem_app('ciclo') and (carteira_id is null or security.usuario_tem_carteira(carteira_id))
);

drop policy if exists timeline_write_ciclo_scope on ciclo.timeline_cliente;
create policy timeline_write_ciclo_scope on ciclo.timeline_cliente for all to authenticated using (
  security.usuario_tem_app('ciclo') and (carteira_id is null or security.usuario_tem_carteira(carteira_id))
) with check (
  security.usuario_tem_app('ciclo') and (carteira_id is null or security.usuario_tem_carteira(carteira_id))
);

drop policy if exists ocorrencias_select_ciclo_scope on ciclo.ocorrencias;
create policy ocorrencias_select_ciclo_scope on ciclo.ocorrencias for select to authenticated using (
  security.usuario_tem_app('ciclo') and (carteira_id is null or security.usuario_tem_carteira(carteira_id))
);

drop policy if exists ocorrencias_write_ciclo_scope on ciclo.ocorrencias;
create policy ocorrencias_write_ciclo_scope on ciclo.ocorrencias for all to authenticated using (
  security.usuario_tem_permissao('ciclo.alertas.write') and (carteira_id is null or security.usuario_tem_carteira(carteira_id))
) with check (
  security.usuario_tem_permissao('ciclo.alertas.write') and (carteira_id is null or security.usuario_tem_carteira(carteira_id))
);

drop policy if exists contratos_select_ciclo_scope on ciclo.contratos;
create policy contratos_select_ciclo_scope on ciclo.contratos for select to authenticated using (
  security.usuario_tem_app('ciclo') and (carteira_id is null or security.usuario_tem_carteira(carteira_id))
);

drop policy if exists contratos_write_ciclo_scope on ciclo.contratos;
create policy contratos_write_ciclo_scope on ciclo.contratos for all to authenticated using (
  security.usuario_tem_permissao('ciclo.clientes.write') and (carteira_id is null or security.usuario_tem_carteira(carteira_id))
) with check (
  security.usuario_tem_permissao('ciclo.clientes.write') and (carteira_id is null or security.usuario_tem_carteira(carteira_id))
);

drop policy if exists atas_select_ciclo_scope on ciclo.atas;
create policy atas_select_ciclo_scope on ciclo.atas for select to authenticated using (
  security.usuario_tem_app('ciclo') and (carteira_id is null or security.usuario_tem_carteira(carteira_id))
);

drop policy if exists atas_write_ciclo_scope on ciclo.atas;
create policy atas_write_ciclo_scope on ciclo.atas for all to authenticated using (
  security.usuario_tem_permissao('ciclo.clientes.write') and (carteira_id is null or security.usuario_tem_carteira(carteira_id))
) with check (
  security.usuario_tem_permissao('ciclo.clientes.write') and (carteira_id is null or security.usuario_tem_carteira(carteira_id))
);

drop policy if exists importacao_lotes_select_ciclo_scope on ciclo.importacao_lotes;
create policy importacao_lotes_select_ciclo_scope on ciclo.importacao_lotes for select to authenticated using (
  security.usuario_tem_permissao('ciclo.clientes.read')
);

drop policy if exists importacao_lotes_write_ciclo_scope on ciclo.importacao_lotes;
create policy importacao_lotes_write_ciclo_scope on ciclo.importacao_lotes for all to authenticated using (
  security.usuario_tem_permissao('ciclo.clientes.write')
) with check (
  security.usuario_tem_permissao('ciclo.clientes.write')
);

drop policy if exists importacao_lote_itens_select_ciclo_scope on ciclo.importacao_lote_itens;
create policy importacao_lote_itens_select_ciclo_scope on ciclo.importacao_lote_itens for select to authenticated using (
  security.usuario_tem_permissao('ciclo.clientes.read') and (carteira_id is null or security.usuario_tem_carteira(carteira_id))
);

drop policy if exists importacao_lote_itens_write_ciclo_scope on ciclo.importacao_lote_itens;
create policy importacao_lote_itens_write_ciclo_scope on ciclo.importacao_lote_itens for all to authenticated using (
  security.usuario_tem_permissao('ciclo.clientes.write') and (carteira_id is null or security.usuario_tem_carteira(carteira_id))
) with check (
  security.usuario_tem_permissao('ciclo.clientes.write') and (carteira_id is null or security.usuario_tem_carteira(carteira_id))
);

grant usage on schema ciclo to authenticated, service_role;
grant select, insert, update, delete on all tables in schema ciclo to authenticated, service_role;
alter default privileges in schema ciclo grant select, insert, update, delete on tables to authenticated, service_role;
