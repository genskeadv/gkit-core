-- Flex Sprint 6B - aliases de despesas planejadas para matching com extrato.

alter table flex.previsoes_despesa
  add column if not exists aliases text[] not null default '{}'::text[];

create index if not exists idx_flex_previsoes_despesa_aliases
  on flex.previsoes_despesa using gin (aliases);

grant select, insert, update, delete on flex.previsoes_despesa to authenticated, service_role;
grant select, update on flex.extrato_lancamentos to authenticated, service_role;
grant select, insert, update, delete on flex.validacao_itens to authenticated, service_role;

with seed(fornecedor, aliases) as (
  values
    ('Aasp', array['AASP']::text[]),
    ('Astrea', array['AURUM SOFTWARE']::text[]),
    ('Enel', array['ENEL DISTRIBUICAO SAO PAULO']::text[]),
    ('Fenyx', array['A W SERVICOS DE INF COM LTDA']::text[]),
    ('FGTS', array['CEF MATRIZ']::text[]),
    ('INSS', array['RECEITA FEDERAL']::text[]),
    ('J2LG Consultoria', array['JL2G CONSULTORIA E SERVICOS DE TECN', 'J2LG CONSULTORIA']::text[]),
    ('Juliana Vieira', array['MARLENE FUREGATI IMOVEIS LTDA']::text[]),
    ('Montreal Administracao de Imoveis', array['CARMEN NORMANDO W A B C LTDA', 'CONDOMINIO EMPRESARIAL JARDIM SUL']::text[]),
    ('Natalia Dias', array['NATALIA C DIAS ASSESSORIA CONTABIL']::text[]),
    ('Omie', array['OMIEXPERIENCE LTDA']::text[]),
    ('Simples', array['SIMPLES NACIONAL']::text[]),
    ('SND Distribuicao de Produtos de Informatica S/A', array['BANCO BBM S A']::text[]),
    ('Vivo', array['TELEFONICA BRAS']::text[]),
    ('Importinvest', array['IMPORTINVEST IMPORTACAO C LTDA']::text[]),
    ('Recrutas', array['RECRUTAS']::text[])
)
update flex.previsoes_despesa previsao
set aliases = (
  select array_agg(distinct alias order by alias)
  from unnest(coalesce(previsao.aliases, '{}'::text[]) || seed.aliases) as alias
  where nullif(trim(alias), '') is not null
)
from seed
where lower(previsao.fornecedor) = lower(seed.fornecedor);

comment on column flex.previsoes_despesa.aliases is 'Termos alternativos encontrados no extrato bancario para vincular despesas planejadas.';
