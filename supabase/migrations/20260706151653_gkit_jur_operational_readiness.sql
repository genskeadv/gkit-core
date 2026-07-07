begin;

create table if not exists gkit_jur.processos_resumos (
  processo_id uuid primary key references gkit_jur.processos(id) on delete cascade,
  nivel_prontidao text not null default 'sem_base'
    check (nivel_prontidao in ('sem_base', 'capa', 'parcial', 'pronto', 'desatualizado', 'erro')),
  status_resumo text not null default 'pendente'
    check (status_resumo in ('pendente', 'gerado', 'revisao_manual', 'erro')),
  resumo_operacional text,
  fase_processual text,
  ultimos_eventos_relevantes jsonb not null default '[]'::jsonb,
  proximas_acoes_sugeridas jsonb not null default '[]'::jsonb,
  pendencias_identificadas jsonb not null default '[]'::jsonb,
  riscos_alertas jsonb not null default '[]'::jsonb,
  fonte_resumo text not null default 'datajud'
    check (fonte_resumo in ('datajud', 'manual', 'hibrido', 'sistema')),
  criterio_prontidao jsonb not null default '{}'::jsonb,
  movimentacoes_consideradas integer not null default 0,
  movimentacoes_relevantes integer not null default 0,
  ultima_movimentacao_considerada_em timestamptz,
  base_sincronizacao_em timestamptz,
  resumo_hash text,
  modelo_versao text not null default 'operacional-v1',
  gerado_em timestamptz,
  erro_mensagem text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_gkit_jur_processos_resumos_nivel
  on gkit_jur.processos_resumos(nivel_prontidao);

create index if not exists idx_gkit_jur_processos_resumos_status
  on gkit_jur.processos_resumos(status_resumo);

create index if not exists idx_gkit_jur_processos_resumos_base_sync
  on gkit_jur.processos_resumos(base_sincronizacao_em desc nulls last);

create or replace function gkit_jur.proximos_processos_sync(
  p_limit integer default 25,
  p_tribunal text default null,
  p_processo_id uuid default null
)
returns table (
  id uuid,
  numero_cnj text,
  numero_cnj_limpo text,
  tribunal_alias text,
  carteira_id uuid,
  responsavel_id uuid,
  nivel_prontidao text
)
language sql
stable
security invoker
as $$
  select
    p.id,
    p.numero_cnj,
    p.numero_cnj_limpo,
    p.tribunal_alias,
    p.carteira_id,
    p.responsavel_id,
    coalesce(r.nivel_prontidao, 'sem_base') as nivel_prontidao
  from gkit_jur.processos p
  left join gkit_jur.processos_resumos r on r.processo_id = p.id
  where p.status = 'ativo'
    and p.tribunal_alias is not null
    and (p_processo_id is null or p.id = p_processo_id)
    and (p_processo_id is not null or p.status_monitoramento = 'monitorando')
    and (p_tribunal is null or p.tribunal_sigla = p_tribunal)
  order by
    case coalesce(r.nivel_prontidao, 'sem_base')
      when 'sem_base' then 0
      when 'capa' then 1
      when 'parcial' then 2
      when 'desatualizado' then 3
      when 'erro' then 4
      when 'pronto' then 5
      else 6
    end,
    p.ultima_sincronizacao_em asc nulls first,
    p.updated_at asc nulls first
  limit greatest(1, least(coalesce(p_limit, 25), 25));
$$;

alter table gkit_jur.processos_resumos enable row level security;

drop policy if exists processos_resumos_read_scope on gkit_jur.processos_resumos;
create policy processos_resumos_read_scope on gkit_jur.processos_resumos
  for select to authenticated
  using ((select security.is_admin_global()) or security.usuario_tem_permissao('gkit_jur.processos.read'));

drop policy if exists processos_resumos_write_scope on gkit_jur.processos_resumos;
create policy processos_resumos_write_scope on gkit_jur.processos_resumos
  for all to authenticated
  using (
    (select security.is_admin_global())
    or security.usuario_tem_permissao('gkit_jur.processos.sync')
    or security.usuario_tem_permissao('gkit_jur.processos.write')
  )
  with check (
    (select security.is_admin_global())
    or security.usuario_tem_permissao('gkit_jur.processos.sync')
    or security.usuario_tem_permissao('gkit_jur.processos.write')
  );

grant usage on schema gkit_jur to authenticated, service_role;
grant select on gkit_jur.processos_resumos to authenticated;
grant select, insert, update, delete on gkit_jur.processos_resumos to service_role;
grant execute on function gkit_jur.proximos_processos_sync(integer, text, uuid) to service_role;

comment on table gkit_jur.processos_resumos is 'Resumo operacional e nivel de prontidao dos processos acompanhados pelo GKIT Jur.';
comment on column gkit_jur.processos_resumos.nivel_prontidao is 'Nivel usado pela fila de sincronizacao para priorizar processos ainda nao aceitaveis operacionalmente.';
comment on column gkit_jur.processos_resumos.resumo_operacional is 'Resumo sintetico gerado a partir da capa, movimentacoes relevantes, ultimas movimentacoes e tarefas.';

notify pgrst, 'reload schema';

commit;
