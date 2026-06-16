-- GKIT Flex - Categorias financeiras de despesas recorrentes
-- Popula as categorias de despesa usadas pela previsao mensal e vincula as previsoes existentes.

begin;

with seed(nome, macrogrupo) as (
  values
    ('Licencas Microsoft', 'operacional'),
    ('Aluguel, cond. e IPTU sala 140', 'operacional'),
    ('Aluguel, cond. e IPTU sala 141', 'operacional'),
    ('TI', 'operacional'),
    ('Publicacoes', 'operacional'),
    ('Seguro', 'operacional'),
    ('Energia eletrica', 'operacional'),
    ('Sistema Financeiro', 'operacional'),
    ('Pesquisas', 'operacional'),
    ('Sistema Processual', 'operacional'),
    ('Contabilidade', 'operacional'),
    ('Impostos', 'operacional'),
    ('Telefonia e Internet', 'operacional'),
    ('Impressora', 'operacional'),
    ('OAB', 'operacional'),
    ('Hospedagem', 'operacional'),
    ('Caixa interno', 'operacional'),
    ('Provisao 13o', 'operacional'),
    ('Jurisprudencia', 'operacional'),
    ('Drive', 'operacional'),
    ('Sistema de acordos', 'operacional'),
    ('Emprestimo (2)', 'operacional'),
    ('Prestacao de servicos', 'operacional'),
    ('Escritorio', 'operacional'),
    ('Motoboy', 'operacional')
)
insert into flex.categorias_financeiras (nome, macrogrupo, tipo, status)
select nome, macrogrupo, 'despesa', 'ativo'
from seed
on conflict (nome, macrogrupo) do update
set
  tipo = case
    when flex.categorias_financeiras.tipo = 'receita' then 'ambos'
    else excluded.tipo
  end,
  status = 'ativo',
  atualizado_em = now();

update flex.previsoes_despesa previsao
set categoria_id = categoria.id
from flex.categorias_financeiras categoria
where lower(categoria.nome) = lower(previsao.tipo_despesa)
  and categoria.tipo in ('despesa', 'ambos')
  and previsao.categoria_id is null;

commit;
