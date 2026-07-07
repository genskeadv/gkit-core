-- Performance indexes for GKIT Jur list screens and sync queue.

create index if not exists idx_gkit_jur_movimentacoes_data_global
  on gkit_jur.movimentacoes(data_hora desc nulls last, id);

create index if not exists idx_gkit_jur_movimentacoes_data_processo
  on gkit_jur.movimentacoes(data_hora desc nulls last, processo_id, id);

create index if not exists idx_gkit_jur_movimentacoes_origem_data
  on gkit_jur.movimentacoes(origem, data_hora desc nulls last, id)
  where origem is not null;

create index if not exists idx_gkit_jur_movimentacoes_relevantes_data
  on gkit_jur.movimentacoes(data_hora desc nulls last, id)
  where relevante is true or gera_alerta is true;

create index if not exists idx_gkit_jur_movimentacoes_created_at
  on gkit_jur.movimentacoes(created_at desc);

create index if not exists idx_gkit_jur_processos_ativos_operacao
  on gkit_jur.processos(
    status,
    status_monitoramento,
    tribunal_alias,
    ultima_sincronizacao_em asc nulls first,
    updated_at asc nulls first
  )
  where status = 'ativo' and tribunal_alias is not null;

create index if not exists idx_gkit_jur_sincronizacoes_transientes_recent
  on gkit_jur.sincronizacoes(processo_id, started_at desc)
  where status in ('timeout', 'erro')
    and erro_codigo in (
      'DATAJUD_TRANSIENT_ERROR',
      'HTTP_408',
      'HTTP_409',
      'HTTP_425',
      'HTTP_429',
      'HTTP_500',
      'HTTP_502',
      'HTTP_503',
      'HTTP_504'
    );

create index if not exists idx_gkit_jur_sincronizacoes_started_at
  on gkit_jur.sincronizacoes(started_at desc);
