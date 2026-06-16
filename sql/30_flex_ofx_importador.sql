-- GKIT Flex - Importador OFX Banco Inter
-- Rodar apos o script 29. Reforca deduplicacao por FITID/origem_chave.

begin;

create unique index if not exists ux_flex_extrato_lancamentos_origem_chave
  on flex.extrato_lancamentos(origem_chave)
  where origem_chave is not null;

grant usage on schema flex to authenticated, service_role;
grant select, insert, update, delete on flex.importacoes to authenticated, service_role;
grant select, insert, update, delete on flex.extratos to authenticated, service_role;
grant select, insert, update, delete on flex.extrato_lancamentos to authenticated, service_role;
grant select, insert, update, delete on flex.previsoes_despesa to authenticated, service_role;
grant select, insert, update, delete on flex.validacao_itens to authenticated, service_role;

commit;
