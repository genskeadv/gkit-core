-- Flex Sprint 6 - fechamento mensal por competencia.
-- Idempotente para publicar o controle operacional de estados mensais.

alter table flex.fechamentos
  drop constraint if exists fechamentos_status_check;

alter table flex.fechamentos
  add constraint fechamentos_status_check
  check (status in ('aberto', 'em_validacao', 'pronto_para_fechar', 'fechado', 'reaberto'));

alter table flex.fechamento_checklist
  drop constraint if exists fechamento_checklist_status_check;

alter table flex.fechamento_checklist
  add constraint fechamento_checklist_status_check
  check (status in ('pendente', 'ok'));

create index if not exists idx_flex_fechamentos_status on flex.fechamentos(status);
create index if not exists idx_flex_fechamento_checklist_status on flex.fechamento_checklist(status);

alter table flex.fechamentos enable row level security;
alter table flex.fechamento_checklist enable row level security;

grant usage on schema flex to authenticated, service_role;
grant select, insert, update, delete on flex.fechamentos to authenticated, service_role;
grant select, insert, update, delete on flex.fechamento_checklist to authenticated, service_role;
grant select on flex.receitas to authenticated, service_role;
grant select on flex.extratos to authenticated, service_role;
grant select on flex.extrato_lancamentos to authenticated, service_role;
grant select on flex.orcamentos to authenticated, service_role;
grant select on flex.validacoes to authenticated, service_role;
grant select on flex.validacao_itens to authenticated, service_role;
grant select on flex.comissoes to authenticated, service_role;
grant select on flex.pagamentos to authenticated, service_role;

update flex.fechamentos
set status = case
  when status = 'fechado' then 'fechado'
  when pendencias_total = 0 then 'pronto_para_fechar'
  when status = 'reaberto' then 'reaberto'
  else 'em_validacao'
end
where status not in ('aberto', 'em_validacao', 'pronto_para_fechar', 'fechado', 'reaberto')
   or (status = 'aberto' and pendencias_total = 0);

comment on table flex.fechamentos is 'Controle mensal do Flex: aberto, em_validacao, pronto_para_fechar, fechado ou reaberto.';
comment on table flex.fechamento_checklist is 'Checklist gerado no recalculo da competencia mensal do Flex.';
