begin;

create table if not exists gkit_jur.publicacoes_monitoradas (
  id uuid primary key default gen_random_uuid(),
  processo_id uuid references gkit_jur.processos(id) on delete set null,
  numero_cnj_limpo text not null,
  fonte text not null,
  fonte_evento_id text,
  data_disponibilizacao date,
  data_publicacao date,
  jornal text,
  termo text,
  origem_orgao text,
  arq text,
  pub text,
  texto_preview text,
  texto_hash text not null,
  payload_hash text,
  raw_payload jsonb,
  texto_completo text,
  status text not null default 'pendente' check (
    status in ('pendente', 'triada_ia', 'em_tratamento', 'tratada', 'dispensada', 'duplicada', 'erro')
  ),
  decisao_tratamento text check (
    decisao_tratamento is null
    or decisao_tratamento in (
      'gerar_prazo',
      'gerar_tarefa',
      'registrar_ciencia',
      'vincular_documento',
      'atualizar_resumo',
      'dispensar_sem_acao',
      'marcar_duplicada',
      'revisar_cadastro_processo'
    )
  ),
  classificacao_ia jsonb not null default '{}'::jsonb,
  confianca_ia numeric,
  sugestao_ia text,
  tarefa_id uuid references gkit_jur.tarefas(id) on delete set null,
  prazo_id uuid references gkit_jur.tarefas(id) on delete set null,
  tratado_por uuid references security.usuarios(id) on delete set null,
  tratado_em timestamptz,
  motivo_tratamento text,
  conteudo_retido_ate timestamptz,
  conteudo_removido_em timestamptz,
  criado_por uuid references security.usuarios(id) on delete set null,
  atualizado_por uuid references security.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists gkit_jur_publicacoes_fonte_evento_unique
  on gkit_jur.publicacoes_monitoradas(fonte, fonte_evento_id)
  where fonte_evento_id is not null;

create unique index if not exists gkit_jur_publicacoes_fonte_hash_unique
  on gkit_jur.publicacoes_monitoradas(fonte, numero_cnj_limpo, texto_hash);

create index if not exists idx_gkit_jur_publicacoes_caixa
  on gkit_jur.publicacoes_monitoradas(status, data_disponibilizacao desc nulls last, created_at desc);

create index if not exists idx_gkit_jur_publicacoes_processo
  on gkit_jur.publicacoes_monitoradas(processo_id, data_disponibilizacao desc nulls last, created_at desc);

create index if not exists idx_gkit_jur_publicacoes_hash
  on gkit_jur.publicacoes_monitoradas(numero_cnj_limpo, texto_hash);

create index if not exists idx_gkit_jur_publicacoes_tratamento
  on gkit_jur.publicacoes_monitoradas(tratado_em desc nulls last)
  where status in ('tratada', 'dispensada', 'duplicada');

alter table gkit_jur.publicacoes_monitoradas enable row level security;

drop policy if exists publicacoes_monitoradas_read_scope on gkit_jur.publicacoes_monitoradas;
create policy publicacoes_monitoradas_read_scope on gkit_jur.publicacoes_monitoradas
  for select to authenticated
  using (
    (select security.is_admin_global())
    or (
      security.usuario_tem_permissao('gkit_jur.publicacoes.read')
      and (
        processo_id is null
        or exists (
          select 1
          from gkit_jur.processos p
          where p.id = publicacoes_monitoradas.processo_id
            and (p.carteira_id is null or security.usuario_tem_carteira(p.carteira_id))
        )
      )
    )
  );

drop policy if exists publicacoes_monitoradas_write_scope on gkit_jur.publicacoes_monitoradas;
create policy publicacoes_monitoradas_write_scope on gkit_jur.publicacoes_monitoradas
  for all to authenticated
  using (
    (select security.is_admin_global())
    or (
      security.usuario_tem_permissao('gkit_jur.publicacoes.write')
      and (
        processo_id is null
        or exists (
          select 1
          from gkit_jur.processos p
          where p.id = publicacoes_monitoradas.processo_id
            and (p.carteira_id is null or security.usuario_tem_carteira(p.carteira_id))
        )
      )
    )
  )
  with check (
    (select security.is_admin_global())
    or (
      security.usuario_tem_permissao('gkit_jur.publicacoes.write')
      and (
        processo_id is null
        or exists (
          select 1
          from gkit_jur.processos p
          where p.id = publicacoes_monitoradas.processo_id
            and (p.carteira_id is null or security.usuario_tem_carteira(p.carteira_id))
        )
      )
    )
  );

grant usage on schema gkit_jur to authenticated, service_role;
grant select on gkit_jur.publicacoes_monitoradas to authenticated;
grant select, insert, update, delete on gkit_jur.publicacoes_monitoradas to service_role;

-- The sync code checks archived movement hashes through the service role. Keep
-- this grant explicit so the retention table does not break AASP/DataJud ingest.
grant select, insert, update, delete on gkit_jur.movimentacoes_arquivo to service_role;

with rows(codigo, nome, descricao, recurso, acao, sistema, status) as (
  values
    ('gkit_jur.publicacoes.read', 'GKIT Jur - ler publicacoes', 'Consultar a caixa de entrada de publicacoes e intimacoes.', 'gkit_jur.publicacoes', 'read', true, 'ativo'),
    ('gkit_jur.publicacoes.write', 'GKIT Jur - tratar publicacoes', 'Triar, tratar, dispensar e vincular publicacoes e intimacoes.', 'gkit_jur.publicacoes', 'write', true, 'ativo')
)
insert into security.permissoes (codigo, nome, descricao, app_id, recurso, acao, sistema, status)
select rows.codigo, rows.nome, rows.descricao, apps.id, rows.recurso, rows.acao, rows.sistema, rows.status::core.status_registro
from rows
left join core.apps apps on apps.codigo = 'gkit_jur'
on conflict (codigo) do update
set
  nome = excluded.nome,
  descricao = excluded.descricao,
  app_id = excluded.app_id,
  recurso = excluded.recurso,
  acao = excluded.acao,
  sistema = excluded.sistema,
  status = excluded.status;

comment on table gkit_jur.publicacoes_monitoradas is 'Caixa de entrada de publicacoes e intimacoes capturadas para triagem, tratamento humano e auditoria operacional.';
comment on column gkit_jur.publicacoes_monitoradas.texto_hash is 'Hash do texto normalizado usado para deduplicacao entre coletas.';
comment on column gkit_jur.publicacoes_monitoradas.texto_completo is 'Conteudo bruto opcional sujeito a retencao; o registro minimo de tratamento deve permanecer.';
comment on column gkit_jur.publicacoes_monitoradas.classificacao_ia is 'Sugestao de triagem gerada por IA; nao substitui a confirmacao humana.';
comment on column gkit_jur.publicacoes_monitoradas.decisao_tratamento is 'Decisao humana ou operacional aplicada ao item da caixa.';

notify pgrst, 'reload schema';

commit;
