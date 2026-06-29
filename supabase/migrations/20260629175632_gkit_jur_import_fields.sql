begin;

alter table gkit_jur.processos
  add column if not exists titulo text,
  add column if not exists cliente_nome text,
  add column if not exists pasta text,
  add column if not exists url_processo text,
  add column if not exists importado_de text;

create index if not exists idx_gkit_jur_processos_cliente_nome
  on gkit_jur.processos using gin (to_tsvector('simple', coalesce(cliente_nome, '')));

comment on column gkit_jur.processos.titulo is 'Titulo original importado ou informado manualmente.';
comment on column gkit_jur.processos.cliente_nome is 'Nome snapshot do cliente quando ainda nao houver vinculo com ciclo.clientes.';
comment on column gkit_jur.processos.pasta is 'Pasta/unidade de origem do processo.';
comment on column gkit_jur.processos.url_processo is 'URL externa do processo quando informada pela origem.';
comment on column gkit_jur.processos.importado_de is 'Identificador da origem de importacao manual.';

notify pgrst, 'reload schema';

commit;
