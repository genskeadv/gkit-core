alter table ciclo.cliente_documentos
  add column if not exists drive_file_id text,
  add column if not exists drive_file_path text,
  add column if not exists drive_file_name text,
  add column if not exists drive_file_size_bytes bigint,
  add column if not exists drive_file_mime_type text,
  add column if not exists drive_modified_at timestamptz,
  add column if not exists drive_synced_at timestamptz,
  add column if not exists drive_match_confidence numeric(5, 2);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'cliente_documentos_drive_match_confidence_check'
      and conrelid = 'ciclo.cliente_documentos'::regclass
  ) then
    alter table ciclo.cliente_documentos
      add constraint cliente_documentos_drive_match_confidence_check
      check (drive_match_confidence is null or (drive_match_confidence >= 0 and drive_match_confidence <= 1));
  end if;
end $$;

create table if not exists ciclo.documento_drive_sync_runs (
  id uuid primary key default gen_random_uuid(),
  remote_root text not null,
  dry_run boolean not null default false,
  status text not null default 'em_andamento'
    check (status in ('em_andamento', 'concluido', 'falhou')),
  total_arquivos integer not null default 0 check (total_arquivos >= 0),
  arquivos_reconhecidos integer not null default 0 check (arquivos_reconhecidos >= 0),
  documentos_atualizados integer not null default 0 check (documentos_atualizados >= 0),
  fora_padrao integer not null default 0 check (fora_padrao >= 0),
  erros integer not null default 0 check (erros >= 0),
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists ciclo.documento_drive_arquivos (
  id uuid primary key default gen_random_uuid(),
  sync_run_id uuid references ciclo.documento_drive_sync_runs(id) on delete set null,
  cliente_id uuid references ciclo.clientes(id) on delete set null,
  documento_id uuid references ciclo.cliente_documentos(id) on delete set null,
  carteira_id uuid,
  remote_root text not null,
  caminho text not null,
  nome_arquivo text not null,
  extensao text,
  drive_file_id text,
  arquivo_url text,
  tamanho_bytes bigint check (tamanho_bytes is null or tamanho_bytes >= 0),
  mime_type text,
  modificado_em timestamptz,
  documento_cliente text,
  cliente_slug text,
  tipo_documento text,
  data_vencimento date,
  sem_vencimento boolean not null default false,
  versao text,
  parse_status text not null
    check (parse_status in ('catalogado', 'fora_padrao', 'sem_cliente')),
  parse_erros text[] not null default '{}',
  aplicado boolean not null default false,
  aplicacao_mensagem text,
  raw jsonb not null default '{}'::jsonb,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists documento_drive_arquivos_remote_caminho_idx
  on ciclo.documento_drive_arquivos (remote_root, caminho);

create index if not exists documento_drive_arquivos_cliente_tipo_idx
  on ciclo.documento_drive_arquivos (cliente_id, tipo_documento, modificado_em desc nulls last)
  where parse_status = 'catalogado';

create index if not exists documento_drive_arquivos_parse_status_idx
  on ciclo.documento_drive_arquivos (parse_status, last_seen_at desc);

create index if not exists cliente_documentos_drive_synced_idx
  on ciclo.cliente_documentos (drive_synced_at desc nulls last)
  where drive_synced_at is not null;

alter table ciclo.documento_drive_sync_runs enable row level security;
alter table ciclo.documento_drive_arquivos enable row level security;

grant select, insert, update, delete on ciclo.documento_drive_sync_runs to service_role;
grant select, insert, update, delete on ciclo.documento_drive_arquivos to service_role;

comment on table ciclo.documento_drive_sync_runs is
  'Execucoes da varredura documental do Drive para catalogacao do Ciclo.';

comment on table ciclo.documento_drive_arquivos is
  'Catalogo dos arquivos localizados no Drive e o resultado do cruzamento com clientes e documentos do Ciclo.';

comment on column ciclo.cliente_documentos.drive_match_confidence is
  'Confianca do vinculo feito pela rotina de catalogacao do Drive, entre 0 e 1.';
