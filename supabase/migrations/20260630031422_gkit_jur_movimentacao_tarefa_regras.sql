begin;

create table if not exists gkit_jur.movimentacao_tarefa_regras (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  codigo_movimento bigint,
  termos jsonb not null default '[]'::jsonb,
  tipo_tarefa text not null default 'providencia_interna' check (
    tipo_tarefa in (
      'prazo',
      'publicacao',
      'movimentacao_relevante',
      'documento_pendente',
      'providencia_interna',
      'audiencia',
      'cumprimento',
      'revisao'
    )
  ),
  prioridade text not null default 'media' check (prioridade in ('critica', 'alta', 'media', 'baixa')),
  titulo_template text not null,
  descricao_template text,
  prazo_dias integer,
  gerar_automaticamente boolean not null default true,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_gkit_jur_mov_tarefa_regras_ativo
  on gkit_jur.movimentacao_tarefa_regras(ativo, tipo_tarefa, prioridade);

create unique index if not exists gkit_jur_mov_tarefa_regras_nome_unique
  on gkit_jur.movimentacao_tarefa_regras(lower(nome));

alter table gkit_jur.movimentacao_tarefa_regras enable row level security;

drop policy if exists movimentacao_tarefa_regras_read_scope on gkit_jur.movimentacao_tarefa_regras;
create policy movimentacao_tarefa_regras_read_scope on gkit_jur.movimentacao_tarefa_regras
  for select to authenticated
  using ((select security.is_admin_global()) or security.usuario_tem_permissao('gkit_jur.admin.read'));

drop policy if exists movimentacao_tarefa_regras_write_scope on gkit_jur.movimentacao_tarefa_regras;
create policy movimentacao_tarefa_regras_write_scope on gkit_jur.movimentacao_tarefa_regras
  for all to authenticated
  using ((select security.is_admin_global()) or security.usuario_tem_permissao('gkit_jur.admin.write'))
  with check ((select security.is_admin_global()) or security.usuario_tem_permissao('gkit_jur.admin.write'));

grant usage on schema gkit_jur to authenticated, service_role;
grant select on gkit_jur.movimentacao_tarefa_regras to authenticated;
grant select, insert, update, delete on gkit_jur.movimentacao_tarefa_regras to service_role;

insert into gkit_jur.movimentacao_tarefa_regras (
  nome,
  descricao,
  codigo_movimento,
  termos,
  tipo_tarefa,
  prioridade,
  titulo_template,
  descricao_template,
  prazo_dias,
  gerar_automaticamente,
  ativo
)
values
  (
    'Publicacao ou intimacao',
    'Gera tarefa para leitura e classificacao de publicacoes ou intimacoes.',
    null,
    '["publicacao", "intimacao", "disponibilizacao"]'::jsonb,
    'publicacao',
    'alta',
    'Analisar publicacao/intimacao',
    'Movimentacao DataJud: {{movimentacao}}. Processo {{numero_cnj}}.',
    1,
    true,
    true
  ),
  (
    'Audiencia',
    'Gera tarefa para preparar ou acompanhar audiencia.',
    null,
    '["audiencia"]'::jsonb,
    'audiencia',
    'alta',
    'Preparar audiencia',
    'Movimentacao DataJud: {{movimentacao}}. Verificar pauta e providencias.',
    2,
    true,
    true
  ),
  (
    'Prazo processual',
    'Gera tarefa de prazo quando a movimentacao indicar abertura, decurso ou cumprimento.',
    null,
    '["prazo", "decurso", "cumprir", "cumprimento"]'::jsonb,
    'prazo',
    'alta',
    'Tratar prazo processual',
    'Movimentacao DataJud: {{movimentacao}}. Conferir prazo e responsavel.',
    1,
    true,
    true
  ),
  (
    'Decisao ou despacho',
    'Gera tarefa de revisao para decisoes e despachos.',
    null,
    '["decisao", "despacho"]'::jsonb,
    'revisao',
    'media',
    'Revisar decisao/despacho',
    'Movimentacao DataJud: {{movimentacao}}. Avaliar providencia cabivel.',
    2,
    true,
    true
  ),
  (
    'Sentenca ou acordao',
    'Gera tarefa prioritaria para sentencas, acordaos e julgamentos.',
    null,
    '["sentenca", "acordao", "julgamento"]'::jsonb,
    'revisao',
    'alta',
    'Revisar julgamento',
    'Movimentacao DataJud: {{movimentacao}}. Avaliar recurso, cumprimento ou encerramento.',
    2,
    true,
    true
  )
on conflict do nothing;

comment on table gkit_jur.movimentacao_tarefa_regras is 'De/para configuravel para gerar tarefas a partir de movimentacoes DataJud.';
comment on column gkit_jur.movimentacao_tarefa_regras.termos is 'Lista de termos normalizados usados para identificar a movimentacao quando nao houver codigo CNJ especifico.';
comment on column gkit_jur.movimentacao_tarefa_regras.titulo_template is 'Template simples do titulo da tarefa; aceita {{movimentacao}} e {{numero_cnj}}.';

notify pgrst, 'reload schema';

commit;
