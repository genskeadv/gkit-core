alter table gkit_jur.pre_juridicos
  add column if not exists laudo_pdf_url text,
  add column if not exists unidade text,
  add column if not exists bloco text,
  add column if not exists responsavel_unidade text,
  add column if not exists cotas_debito jsonb not null default '[]'::jsonb,
  add column if not exists ata_eleicao_status text not null default 'pendente',
  add column if not exists ata_prestacao_contas_status text not null default 'pendente',
  add column if not exists debitos_atualizados_status text not null default 'pendente',
  add column if not exists procuracao_status text not null default 'pendente',
  add column if not exists administradora_email text,
  add column if not exists sindico_email text,
  add column if not exists administradora_solicitada_em timestamptz,
  add column if not exists administradora_retorno_em timestamptz,
  add column if not exists procuracao_gerada_em timestamptz,
  add column if not exists procuracao_enviada_em timestamptz,
  add column if not exists sindico_retorno_em timestamptz,
  add column if not exists pronto_distribuicao_em timestamptz;

alter table gkit_jur.pre_juridicos
  drop constraint if exists pre_juridicos_ata_eleicao_status_check,
  drop constraint if exists pre_juridicos_ata_prestacao_contas_status_check,
  drop constraint if exists pre_juridicos_debitos_atualizados_status_check,
  drop constraint if exists pre_juridicos_procuracao_status_check,
  drop constraint if exists pre_juridicos_cotas_debito_array_check;

alter table gkit_jur.pre_juridicos
  add constraint pre_juridicos_ata_eleicao_status_check
    check (ata_eleicao_status in ('pendente', 'solicitada', 'recebida', 'dispensada')),
  add constraint pre_juridicos_ata_prestacao_contas_status_check
    check (ata_prestacao_contas_status in ('pendente', 'solicitada', 'recebida', 'dispensada')),
  add constraint pre_juridicos_debitos_atualizados_status_check
    check (debitos_atualizados_status in ('pendente', 'solicitado', 'recebido', 'dispensado')),
  add constraint pre_juridicos_procuracao_status_check
    check (procuracao_status in ('pendente', 'gerada', 'enviada', 'assinada', 'dispensada')),
  add constraint pre_juridicos_cotas_debito_array_check
    check (jsonb_typeof(cotas_debito) = 'array');

create index if not exists pre_juridicos_fluxo_documental_idx
  on gkit_jur.pre_juridicos (
    ata_eleicao_status,
    ata_prestacao_contas_status,
    debitos_atualizados_status,
    procuracao_status,
    status
  );

comment on column gkit_jur.pre_juridicos.laudo_pdf_url is 'Referencia ao laudo PDF recebido no fluxo pre-juridico.';
comment on column gkit_jur.pre_juridicos.unidade is 'Unidade identificada no laudo pre-juridico.';
comment on column gkit_jur.pre_juridicos.bloco is 'Bloco identificado no laudo pre-juridico.';
comment on column gkit_jur.pre_juridicos.responsavel_unidade is 'Responsavel pela unidade conforme laudo ou conferencia manual.';
comment on column gkit_jur.pre_juridicos.cotas_debito is 'Composicao manual ou extraida da divida: recibo, vencimento e valor por cota.';
comment on column gkit_jur.pre_juridicos.ata_eleicao_status is 'Semaforo da ata de eleicao: pendente, solicitada, recebida ou dispensada.';
comment on column gkit_jur.pre_juridicos.ata_prestacao_contas_status is 'Semaforo da ata de prestacao de contas: pendente, solicitada, recebida ou dispensada.';
comment on column gkit_jur.pre_juridicos.debitos_atualizados_status is 'Semaforo da planilha/debitos atualizados solicitados a administradora.';
comment on column gkit_jur.pre_juridicos.procuracao_status is 'Semaforo da procuracao: pendente, gerada, enviada, assinada ou dispensada.';
comment on column gkit_jur.pre_juridicos.pronto_distribuicao_em is 'Momento em que atas, debitos atualizados e procuracao ficaram prontos para distribuicao.';

notify pgrst, 'reload schema';
