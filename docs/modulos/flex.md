# GKIT Flex

Atualizado em: 09/06/2026

## Objetivo

O GKIT Flex e o modulo financeiro-operacional da GKIT Suite. Ele concentra o fluxo diario de receitas, despesas, previsao financeira, colaboradores, comissoes, pagamentos e fechamento mensal.

O modulo usa autenticacao, usuarios, carteiras e permissoes do Core. Os colaboradores continuam nascendo no Core e recebem, no Flex, os dados financeiros e operacionais necessarios para previsao, pagamento e comissionamento.

## Principios funcionais

- O operador trabalha por competencia mensal fechada, sempre escolhida em listas controladas.
- Receitas importadas do Omie alimentam indicadores, classificacao e calculo de comissoes.
- Despesas importadas do extrato Banco Inter alimentam a classificacao diaria e a validacao contra a previsao.
- A previsao mensal tambem funciona como calendario financeiro, pois cada item previsto possui dia de pagamento.
- Pagamentos fixos de colaboradores fazem parte da previsao.
- Comissoes aprovadas viram pagamento previsto no dia 20 da competencia corrente.
- O fechamento mensal deve impedir encerramento enquanto houver pendencias relevantes.

## Menu operacional

### Cockpit

Tela inicial do operador financeiro. Resume leituras de operacao, atalhos e pendencias do fluxo.

Estado atual:

- Estrutura visual padronizada no layout premium usado nos modulos New, Ciclo e Flex.
- Mostra blocos de acompanhamento operacional.
- Ainda pode evoluir para uma fila formal de tarefas persistidas por operador.

### Receitas

Fluxo de entradas realizadas.

Funcionalidades prontas:

- Importacao de planilhas Omie no padrao real recebido.
- Registro manual de nova receita.
- Edicao/classificacao de receita existente.
- Lista principal resumida por categoria, sem detalhamento por cliente na tela principal.
- Identificacao de receitas sem categoria como pendencia operacional.
- Base para comissionamento por vendedor Omie, categoria e mapeamento de colaborador/time.

Comportamento esperado:

- Receita importada ou cadastrada entra como realizada.
- Se estiver sem categoria, fica pendente para ajuste.
- Receitas com vendedor preenchido podem ser usadas no calculo de comissoes, desde que exista mapeamento aplicavel.

### Previsao e calendario

Substitui a antiga separacao entre previsao orcamentaria e calendario de contas a pagar.

Funcionalidades prontas:

- Lista consolidada por competencia.
- Filtro por competencia a partir de lista fechada.
- Cadastro de nova previsao pelo botao do header.
- Edicao de previsao existente.
- Previsoes recorrentes de despesas.
- Pagamentos fixos de colaboradores no calendario/previsao.
- Comissoes aprovadas previstas para pagamento no dia 20.
- Agendas de pagamento ativas e pagamentos gerados tambem aparecem na visao consolidada.
- A rota antiga de calendario redireciona para a previsao consolidada.

Comportamento esperado:

- O operador consulta a previsao mensal em sua ultima versao.
- Ajustes manuais sao feitos na propria previsao.
- Itens recorrentes atualizados a partir de validacao de despesas alteram a base esperada para meses seguintes.

### Despesas

Fluxo diario de saidas importadas dos extratos.

Funcionalidades prontas:

- Importacao OFX do Banco Inter.
- Lista unica de despesas por competencia.
- Filtro por competencia e status: todos, pendentes ou classificados.
- Classificacao direta ao clicar na linha da despesa.
- Edicao de fornecedor, data, valor, categoria, macrogrupo, descricao e historico.
- Vinculo de despesa realizada a uma previsao existente.
- Criacao de previsao recorrente a partir de despesa sem previsao.
- Geracao automatica de pendencias item a item ao importar extrato.

Comportamento esperado:

- Despesa importada entra na lista de despesas do mes.
- Se estiver sem categoria, aparece como pendente.
- O operador decide se a despesa deve ser apenas classificada, vinculada a uma previsao ou usada para criar nova previsao recorrente.
- Despesas sem previsao ficam na mao do operador, sem decisao automatica irreversivel.

### Colaboradores

Complemento financeiro e operacional dos usuarios do Core.

Funcionalidades prontas:

- Cadastro de complemento Flex para usuario Core.
- Edicao de funcao/cargo, data de inicio, time, gestor, carteira e status.
- Cadastro de valores de salario, participacao em honorarios, pro-labore, ajuda de custo, outros vencimentos e beneficio.
- Indicacao se participa da apuracao de comissoes.
- Redirecionamento para a lista apos criar ou editar.
- Sincronizacao dos valores fixos com a previsao/calendario financeiro.
- Exibicao de colaboradores ja cadastrados.

Decisao funcional:

- Nao ha mais flags separadas para tipos de recebimento fixo.
- Um recebimento fixo existe quando o respectivo valor for maior que zero.
- A excecao e a participacao em comissoes, que continua como configuracao explicita.

### Comissoes

Fluxo de parametrizacao, apuracao e aprovacao de comissoes.

Funcionalidades prontas:

- Cadastro de tipos de comissao por categoria de receita.
- Percentual, base de calculo, escopo individual ou por time, vigencia e status.
- Mapeamento de vendedor Omie para colaborador ou time.
- Tela de mapeamentos no menu de comissoes.
- Geracao de comissoes a partir das receitas realizadas.
- Rateio por time entre membros ativos aptos a comissionamento.
- Aprovacao ou rejeicao de comissoes.
- Comissao aprovada gera pagamento previsto no dia 20.

Comportamento esperado:

- A apuracao e feita sobre receitas do mes anterior.
- O pagamento ocorre no mes corrente, no dia 20.
- A aprovacao e o ponto que libera a comissao para o calendario/previsao de pagamentos.

### Gestao

Area de conferencia, pendencias e fechamento.

Funcionalidades prontas:

- Controle de competencias mensais.
- Status de fechamento: aberto, em validacao, pronto para fechar, fechado e reaberto.
- Recalculo de fechamento.
- Abertura da proxima competencia.
- Fechamento e reabertura de competencia.
- Checklist de bloqueios.
- Visao de pendencias financeiras separando receitas e despesas.
- Acesso a rotinas de validacao manual quando necessario.

Comportamento esperado:

- O dia a dia acontece em Receitas, Despesas e Previsao.
- A Gestao fica para conferencia, excecoes, validacao de fechamento e indicadores.

### Configuracoes e apoio

Funcionalidades prontas:

- Categorias financeiras.
- Tipos de pagamento.
- Times.
- Tipos de comissao.
- Mapeamentos Omie para comissoes.
- Importacoes.
- Pagamentos e agenda interna.

Algumas dessas telas sao de apoio administrativo e nao precisam aparecer como fluxo principal do operador, mas ja existem para manutencao da base.

## Fluxos principais

### Receitas e comissoes

1. Importar planilha Omie ou cadastrar receita manual.
2. Classificar receitas sem categoria.
3. Configurar tipos de comissao por categoria.
4. Mapear vendedor Omie para colaborador ou time.
5. Gerar comissoes da competencia.
6. Revisar e aprovar comissoes.
7. Comissoes aprovadas entram na previsao/calendario no dia 20.

### Despesas e previsao

1. Manter previsoes recorrentes na tela Previsao.
2. Importar extrato OFX na competencia.
3. O Flex cria as despesas realizadas e gera pendencias item a item.
4. O operador classifica despesas pendentes.
5. O operador vincula a previsao existente ou cria nova previsao recorrente quando aplicavel.
6. A Gestao acompanha divergencias e fechamento.

### Colaboradores e pagamentos fixos

1. Usuario e criado no Core.
2. Flex complementa dados operacionais e financeiros.
3. Valores fixos maiores que zero entram na previsao/calendario.
4. Alteracoes no cadastro atualizam a base de pagamentos esperados.

### Fechamento mensal

1. Conferir receitas, despesas, previsao e comissoes.
2. Resolver pendencias de classificacao e divergencias.
3. Recalcular fechamento.
4. Fechar competencia.
5. Abrir competencia seguinte.

## Schema e objetos relevantes

Schema principal: `flex`.

Tabelas e areas principais:

- `flex.importacoes`
- `flex.receitas`
- `flex.extratos`
- `flex.extrato_lancamentos`
- `flex.despesas_recorrentes`
- `flex.orcamentos`
- `flex.validacoes`
- `flex.validacao_itens`
- `flex.sugestoes`
- `flex.colaboradores`
- `flex.times`
- `flex.time_membros`
- `flex.tipos_comissao`
- `flex.comissoes`
- `flex.receita_mapeamentos`
- `flex.pagamento_agendas`
- `flex.pagamentos`
- `flex.fechamentos`
- `flex.fechamento_checklist`
- `flex.categorias_financeiras`
- `flex.tipos_pagamento`

Scripts SQL relevantes:

- `sql/20_flex_bootstrap.sql`: schema base, tabelas e permissoes.
- `sql/21_flex_colab_publicacoes.sql`: base para publicacoes futuras ao Colab.
- `sql/29_flex_sprint5_despesas_validacao.sql`: previsao, validacao item a item e seed inicial.
- `sql/30_flex_ofx_importador.sql`: suporte ao importador OFX.
- `sql/31_flex_fechamento_mensal.sql`: fechamento mensal.
- `sql/32_flex_despesas_aliases_matching.sql`: matching de despesas por aliases.
- `sql/33_flex_receitas_omie_importador.sql`: importacao de receitas Omie.
- `sql/34_flex_colaboradores_recebimentos.sql`: dados financeiros de colaboradores.
- `sql/35_flex_recupera_times_categorias_comissoes.sql`: recuperacao de times, categorias e tipos de comissao.
- `sql/36_flex_mapeamento_omie_comissoes.sql`: mapeamentos Omie para comissoes.
- `sql/37_flex_categorias_despesa.sql`: categorias de despesas.
- `sql/99_flex_cleanup_legacy.sql`: limpeza de estruturas antigas.

## Estado funcional por area

| Area | Estado | Observacao |
| --- | --- | --- |
| Autenticacao Core | Pronto | Usa usuarios, carteiras e permissoes do Core. |
| Shell visual Flex | Pronto | Menu agrupado por operacao e padrao visual atualizado. |
| Receitas Omie | Pronto | Importa e consolida por categoria. |
| Receita manual | Pronto | Botao "Nova receita" leva ao cadastro manual. |
| Classificacao de receitas | Pronto | Ajuste individual por receita. |
| Importacao OFX | Pronto | Importa extratos Banco Inter e gera despesas. |
| Lista de despesas | Pronto | Lista unica com filtros de competencia e status. |
| Validacao item a item | Pronto | Gerada automaticamente ao importar extrato. |
| Previsao e calendario | Pronto | Consolidado em uma unica tela. |
| Colaboradores Flex | Pronto | Complementa usuarios do Core e alimenta previsao. |
| Times | Pronto | Cadastro e uso no comissionamento. |
| Tipos de comissao | Pronto | Percentual por categoria e escopo. |
| Mapeamento Omie | Pronto | Vendedor Omie para colaborador ou time. |
| Apuracao de comissoes | Pronto | Gera valores individuais e por time. |
| Aprovacao de comissoes | Pronto | Comissao aprovada sobe para pagamento previsto dia 20. |
| Pagamentos | Pronto | Agenda, geracao e conciliacao basica. |
| Fechamento mensal | Pronto | Recalculo, fechamento, reabertura e checklist. |
| Dashboard gerencial | Parcial | Indicadores existem, mas ainda falta refinamento executivo. |
| Tarefas formais do operador | Parcial | Cockpit existe; fila persistida pode ser evoluida. |
| Integracao Colab | Planejado | Views/base inicial existem, consumo final ainda nao foi feito. |

## Pontos de atencao antes da homologacao

- Rodar uma bateria com dados reais de pelo menos uma competencia completa.
- Conferir se todas as categorias de despesas foram cadastradas corretamente no Supabase.
- Conferir mapeamentos Omie para todos os vendedores com receita comissionavel.
- Conferir se todos os colaboradores com pagamento fixo possuem valores corretos.
- Validar regras de rateio por time com casos reais.
- Validar fechamento de uma competencia com pendencias e sem pendencias.
- Revisar permissoes/RLS no ambiente final antes de liberar para usuarios.

## Proximos passos recomendados

1. Homologacao operacional de uma competencia real
   - Importar receitas Omie.
   - Importar extrato OFX.
   - Classificar despesas pendentes.
   - Ajustar previsoes criadas a partir de despesas.
   - Gerar e aprovar comissoes.
   - Conferir previsao/calendario.
   - Fechar competencia.

2. Ajustar dados mestres
   - Categorias financeiras definitivas.
   - Tipos de comissao definitivos.
   - Times e membros ativos.
   - Mapeamentos Omie.
   - Valores fixos dos colaboradores.

3. Refinar dashboard de Gestao
   - Indicadores de receitas por categoria.
   - Indicadores de despesas por categoria e macrogrupo.
   - Resultado previsto x realizado.
   - Pendencias de fechamento.
   - Comissoes apuradas, aprovadas e pagas.

4. Evoluir Cockpit para tarefas persistidas
   - Criar fila unica de tarefas do operador.
   - Prioridade, responsavel, prazo e origem.
   - Links diretos para corrigir cada item.

5. Preparar integracao futura com Colab
   - Revisar views de publicacao.
   - Definir contrato de dados.
   - Garantir que apenas informacoes aprovadas sejam expostas.

6. Fazer auditoria tecnica antes do uso assistido
   - RLS e grants.
   - Indices das consultas principais.
   - Tratamento de erros de importacao.
   - Logs de importacao e reprocessamento.
   - Teste de build e typecheck.

## Criterio de pronto para teste assistido

O modulo pode entrar em teste assistido quando:

- Uma competencia real importar receitas e despesas sem erro.
- Todas as pendencias de classificacao puderem ser tratadas pela interface.
- A previsao consolidada exibir despesas recorrentes, colaboradores e comissoes aprovadas.
- Pelo menos uma apuracao de comissoes for validada com dados reais.
- Uma competencia for fechada e reaberta com sucesso em ambiente de teste.
- O operador conseguir executar o fluxo sem acessar SQL manualmente.
