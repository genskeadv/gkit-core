# Modulo Intr

## Papel

O Intr concentra operacao interna, pessoas, times, receitas, comissoes, pagamentos, agenda de pagamentos e fechamentos. Tambem e a fonte de dados do Colab.

## Funcionalidades prontas

- Cockpit e painel.
- Colaboradores e times.
- Receitas.
- Importacao de receitas Omie em XLSX, com preview e chave anti-duplicidade por boleto/origem.
- Distribuicao de comissoes na importacao de receitas usando `Vendedor` como colaborador ou time.
- Comissoes com acoes por linha.
- Pagamentos.
- Agenda de pagamentos recorrentes.
- Geracao de pagamentos previstos por competencia.
- Importacao de recibos de pagamento em PDF, com preview por colaborador e competencia.
- Fechamentos mensais com recalculo e travas.
- Integridade, cadastros, importacoes e listas de apoio.
- Permissoes finas por dominio do Intr.

## Telas principais

- `/modulos/intr`
- `/modulos/intr/painel`
- `/modulos/intr/colaboradores`
- `/modulos/intr/times`
- `/modulos/intr/receitas`
- `/modulos/intr/comissoes`
- `/modulos/intr/pagamentos`
- `/modulos/intr/pagamentos/agenda`
- `/modulos/intr/pagamentos/importacoes`
- `/modulos/intr/fechamentos`
- `/modulos/intr/cadastros`
- `/modulos/intr/cadastros/tipos-comissao`
- `/modulos/intr/importacoes`
- `/modulos/intr/integridade`
- `/modulos/intr/reembolsos`
- `/modulos/intr/documentos`
- `/modulos/intr/comunicados`

## Base tecnica

- Schema: `gkli_intr`.
- Rotas: `app/modulos/intr/*`.
- Dados: `features/intr/queries.ts`.
- Escritas: `features/intr/actions.ts`.
- Componentes: `features/intr/components.tsx`.
- SQL complementar:
  - `sql/07_intr_receitas_comissoes.sql`
  - `sql/08_intr_agenda_pagamentos.sql`
  - `sql/09_intr_fechamentos_comissoes.sql`
  - `sql/10_intr_permissoes_finas.sql`
  - `sql/11_intr_receita_importacoes.sql`
  - `sql/12_intr_tipos_comissao.sql`

## UX/UI atual

- Shell lateral padrao.
- Menu recolhivel.
- Fluxo de comissoes sem necessidade de copiar ID.
- Agenda e pagamentos com acoes operacionais na propria tela.
- Preview de recibos CLT/pro-labore antes da gravacao, com alerta para nomes sem vinculo.
- Preview de receitas XLSX antes da gravacao, com totais, criacao/atualizacao e linhas ignoradas.
- Preview de comissoes calculadas por receita; vendedor pode ser colaborador ou time, com rateio igual entre membros ativos.
- Listas longas com rolagem interna.

## Pontos fracos e atencao

- As migrations `07`, `08`, `09`, `10`, `11` e `12` precisam estar aplicadas na base real antes de operar em producao.
- O fluxo financeiro completo precisa ser validado com dados reais: receita -> comissao -> aprovacao -> pagamento previsto -> fechamento.
- A importacao de recibos depende de nome igual entre PDF e colaborador ativo; divergencias aparecem no preview e precisam ser corrigidas antes da carga.
- A importacao de receitas guarda dados extras do Omie em `observacao`; se esses campos precisarem de filtro/relatorio proprio, vale criar colunas dedicadas.
- A distribuicao automatica depende de `Vendedor` preenchido e de tipo de comissao ativo com categoria/nome igual a categoria da receita.
- Reembolsos, documentos internos e comunicados ainda nao sao prioridade funcional.
- Beneficios ainda nao possuem tabela propria completa; o Colab usa leitura leve/derivada.
- Como o servidor usa service role em operacoes internas, a verificacao de permissao antes de gravar deve continuar obrigatoria.
