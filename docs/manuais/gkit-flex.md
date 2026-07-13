# Manual de uso - GKIT Flex

## Para que serve

O GKIT Flex concentra rotinas financeiras operacionais: previsoes, receitas,
pagamentos, saneamento de extrato, colaboradores, comissoes, cadastros e
auditoria financeira.

## Quem usa

- Equipe financeira.
- Gestores responsaveis por fechamento e previsao.
- Usuarios que acompanham pagamentos, receitas, comissoes e cadastros financeiros.

## Como acessar

- Cockpit: `/modulos/gkit-flex`
- Previsoes: `/modulos/gkit-flex/previsoes`
- Receitas: `/modulos/gkit-flex/receitas`
- Pagamentos: `/modulos/gkit-flex/pagamentos`
- Saneamento: `/modulos/gkit-flex/saneamento`
- Colaboradores: `/modulos/gkit-flex/colaboradores`
- Comissoes: `/modulos/gkit-flex/comissoes`
- Cadastros: `/modulos/gkit-flex/cadastros`
- Auditoria: `/modulos/gkit-flex/auditoria`

## Visao rapida do fluxo

1. Revise o cockpit financeiro.
2. Gere ou confira previsoes.
3. Apure receitas.
4. Classifique pagamentos e extratos pendentes.
5. Revise colaboradores e regras de comissao.
6. Acompanhe auditoria antes de fechar informacoes sensiveis.

## Telas principais

### Cockpit

Use como tela diaria do financeiro. Ele deve orientar a execucao: pendencias,
atalhos, fechamento e pontos que precisam de saneamento.

### Previsoes

Use para projetar valores futuros e acompanhar receitas ou despesas previstas.
Antes de salvar uma previsao, confira periodo, origem e criterio aplicado.

### Receitas

Use para visualizar ou apurar receitas. Quando nao houver apuracao salva, a tela
pode indicar ausencia de receitas para o periodo.

### Pagamentos

Use para acompanhar contas a pagar, baixas, vencimentos e status de pagamento.
Confira fornecedor, competencia, vencimento, valor e categoria.

### Saneamento

Use para classificar itens importados sem categoria ou com informacao incompleta.
Essa tela evita que dados indefinidos contaminem relatorios e previsoes.

### Colaboradores

Use para complementar o cadastro financeiro de usuarios e colaboradores. Esses
dados podem impactar pagamentos, comissoes e integracao com outros modulos.

### Comissoes

Use para calcular, conferir e acompanhar comissoes. Revise regras, periodo e
base de calculo antes de executar ou aprovar.

### Cadastros

Use para manter categorias, parametros, contas, regras e dados auxiliares do
financeiro.

### Auditoria

Use para conferir eventos, alteracoes e trilhas relevantes antes de fechar ou
explicar divergencias.

## Rotina recomendada

1. Abra o cockpit e veja pendencias.
2. Saneie classificacoes incompletas.
3. Revise pagamentos vencidos ou proximos do vencimento.
4. Atualize previsoes e receitas.
5. Confira comissoes antes de qualquer fechamento.
6. Use auditoria para investigar ajustes relevantes.

## Boas praticas

- Nao feche relatorio financeiro com itens sem classificacao.
- Padronize categorias e evite duplicidade em cadastros.
- Revise colaboradores antes de calcular comissoes.
- Confirme competencia e vencimento em pagamentos.
- Use auditoria para rastrear divergencias em vez de refazer ajustes sem contexto.
