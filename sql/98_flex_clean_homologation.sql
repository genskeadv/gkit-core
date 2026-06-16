-- Flex - limpeza para homologacao ponta a ponta.
-- Preserva cadastros mestres necessarios:
-- - flex.colaboradores
-- - flex.times
-- - flex.time_membros
-- - flex.categorias_financeiras
-- - flex.tipos_comissao
-- - flex.receita_categoria_mapeamentos
-- - flex.despesa_categoria_mapeamentos
--
-- Executar no SQL Editor do Supabase antes de importar novamente receitas Omie e extrato OFX.

begin;

grant usage on schema flex to service_role;
grant select, insert, update, delete on all tables in schema flex to service_role;

truncate table
  flex.conciliacoes,
  flex.pagamentos,
  flex.pagamento_agendas,
  flex.comissoes,
  flex.validacao_itens,
  flex.validacoes,
  flex.sugestoes,
  flex.orcamentos,
  flex.previsoes_despesa,
  flex.despesas_recorrentes,
  flex.extrato_lancamentos,
  flex.extratos,
  flex.receitas,
  flex.importacao_itens,
  flex.importacoes,
  flex.fechamento_checklist,
  flex.fechamentos,
  flex.eventos,
  flex.receita_mapeamentos,
  flex.regras_classificacao
restart identity;

commit;

select 'colaboradores' as tabela, count(*) as registros from flex.colaboradores
union all
select 'times', count(*) from flex.times
union all
select 'time_membros', count(*) from flex.time_membros
union all
select 'categorias_financeiras', count(*) from flex.categorias_financeiras
union all
select 'tipos_comissao', count(*) from flex.tipos_comissao
union all
select 'receitas', count(*) from flex.receitas
union all
select 'extratos', count(*) from flex.extratos
union all
select 'extrato_lancamentos', count(*) from flex.extrato_lancamentos
union all
select 'previsoes_despesa', count(*) from flex.previsoes_despesa
union all
select 'comissoes', count(*) from flex.comissoes
union all
select 'pagamentos', count(*) from flex.pagamentos
union all
select 'fechamentos', count(*) from flex.fechamentos
order by tabela;
