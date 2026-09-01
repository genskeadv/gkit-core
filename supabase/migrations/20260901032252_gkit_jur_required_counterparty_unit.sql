begin;

alter table if exists gkit_jur.processos
  add column if not exists parte_contraria text,
  add column if not exists unidade text,
  add column if not exists bloco text;

alter table if exists gkit_jur.pre_juridicos
  add column if not exists parte_contraria text;

comment on column gkit_jur.processos.parte_contraria is 'Parte contraria obrigatoria para curadoria operacional do processo.';
comment on column gkit_jur.processos.unidade is 'Unidade relacionada ao debito condominial quando o processo for cobranca ou execucao de cotas.';
comment on column gkit_jur.processos.bloco is 'Bloco da unidade relacionada ao debito condominial.';
comment on column gkit_jur.pre_juridicos.parte_contraria is 'Parte contraria obrigatoria para casos pre-juridicos.';

notify pgrst, 'reload schema';

commit;
