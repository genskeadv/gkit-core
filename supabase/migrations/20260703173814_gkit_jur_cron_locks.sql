begin;

create table if not exists gkit_jur.cron_locks (
  job_key text primary key,
  token uuid not null default gen_random_uuid(),
  locked_at timestamptz not null default now(),
  expires_at timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_gkit_jur_cron_locks_expires_at
  on gkit_jur.cron_locks(expires_at);

alter table gkit_jur.cron_locks enable row level security;

grant usage on schema gkit_jur to service_role;
grant select, insert, update, delete on gkit_jur.cron_locks to service_role;

comment on table gkit_jur.cron_locks is 'Travas operacionais para rotinas agendadas do GKIT Jur.';
comment on column gkit_jur.cron_locks.expires_at is 'Prazo de expiracao da trava para permitir recuperacao em caso de timeout.';

notify pgrst, 'reload schema';

commit;
