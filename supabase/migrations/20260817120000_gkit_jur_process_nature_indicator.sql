begin;

alter table if exists gkit_jur.processos
  add column if not exists natureza_operacional text,
  add column if not exists natureza_operacional_label text,
  add column if not exists natureza_operacional_confianca text,
  add column if not exists natureza_operacional_sinais jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'gkit_jur_processos_natureza_operacional_check'
      and conrelid = 'gkit_jur.processos'::regclass
  ) then
    alter table gkit_jur.processos
      add constraint gkit_jur_processos_natureza_operacional_check
      check (
        natureza_operacional is null
        or natureza_operacional in (
          'execucao_titulo_extrajudicial',
          'execucao_fiscal',
          'cumprimento_sentenca',
          'cobranca_condominial',
          'cobranca_conhecimento',
          'acao_monitoria',
          'despejo_cobranca',
          'incidente_recurso',
          'conhecimento_civel',
          'nao_classificado'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'gkit_jur_processos_natureza_operacional_confianca_check'
      and conrelid = 'gkit_jur.processos'::regclass
  ) then
    alter table gkit_jur.processos
      add constraint gkit_jur_processos_natureza_operacional_confianca_check
      check (
        natureza_operacional_confianca is null
        or natureza_operacional_confianca in ('alta', 'media', 'baixa')
      );
  end if;
end $$;

create index if not exists idx_gkit_jur_processos_natureza_operacional
  on gkit_jur.processos(natureza_operacional)
  where status = 'ativo';

comment on column gkit_jur.processos.natureza_operacional is 'Classificacao operacional derivada de classe, assuntos e demais sinais do DataJud.';
comment on column gkit_jur.processos.natureza_operacional_label is 'Rotulo legivel da natureza operacional do processo.';
comment on column gkit_jur.processos.natureza_operacional_confianca is 'Confianca da classificacao operacional: alta, media ou baixa.';
comment on column gkit_jur.processos.natureza_operacional_sinais is 'Sinais e motivo usados para classificar a natureza operacional do processo.';

notify pgrst, 'reload schema';

commit;

