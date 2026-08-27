alter table if exists public.comissao_lancamentos
  add column if not exists vencimento_em date,
  add column if not exists recebido_em date,
  add column if not exists pontualidade_status text not null default 'sem_datas',
  add column if not exists dias_atraso integer not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'comissao_lancamentos_pontualidade_status_check'
      and conrelid = 'public.comissao_lancamentos'::regclass
  ) then
    alter table public.comissao_lancamentos
      add constraint comissao_lancamentos_pontualidade_status_check
      check (pontualidade_status in ('em_dia', 'atrasado', 'sem_datas'));
  end if;
end $$;

create index if not exists idx_comissao_lancamentos_pontualidade
  on public.comissao_lancamentos (execucao_id, pontualidade_status);

create index if not exists idx_comissao_lancamentos_recebido_em
  on public.comissao_lancamentos (recebido_em desc);

comment on column public.comissao_lancamentos.vencimento_em is
  'Data de vencimento extraida da planilha de receitas.';

comment on column public.comissao_lancamentos.recebido_em is
  'Data do ultimo recebimento extraida da planilha de receitas.';

comment on column public.comissao_lancamentos.pontualidade_status is
  'Pontualidade do recebimento: em_dia quando recebido_em <= vencimento_em, atrasado quando recebido_em > vencimento_em, sem_datas quando a comparacao nao for possivel.';

comment on column public.comissao_lancamentos.dias_atraso is
  'Quantidade de dias de atraso entre vencimento_em e recebido_em.';
