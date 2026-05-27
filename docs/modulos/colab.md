# Modulo Colab

## Papel

O Colab e o portal individual do colaborador. Ele consome dados do Intr e mostra perfil, pagamentos, comissoes, beneficios leves e documentos derivados.

## Funcionalidades prontas

- Cockpit individual.
- Pagamentos.
- Comissoes.
- Beneficios.
- Documentos demonstrativos.
- Perfil do colaborador.
- Vinculo por e-mail do usuario autenticado com colaborador ativo no Intr.

## Telas principais

- `/modulos/colab`
- `/modulos/colab/pagamentos`
- `/modulos/colab/comissoes`
- `/modulos/colab/beneficios`
- `/modulos/colab/documentos`
- `/modulos/colab/perfil`

## Base tecnica

- Consome schema `gkli_intr`.
- Pagamentos reais importados no Intr, incluindo recibos CLT/pro-labore em PDF, aparecem no Colab pelas views/resumos existentes.
- Rotas: `app/modulos/colab/*`.
- Dados: `features/colab/queries.ts`.
- Componentes: `features/colab/components.tsx`.
- Nao possui menu lateral; usa navegacao superior.

## UX/UI atual

- Visual alinhado a suite, mas com caracteristica propria sem sidebar.
- Conteudo em wrapper com rolagem interna no desktop.
- Navegacao por abas superiores.
- Navegacao rapida fixa no mobile para pagamentos, comissoes, beneficios, documentos e perfil.
- Listas financeiras ajustadas para leitura em celular, com valor liquido em destaque leve.
- Tipografia leve e status por pílulas.

## Pontos fracos e atencao

- Documentos reais/anexos ainda nao fazem parte do escopo atual.
- Beneficios dependem de evolucao da modelagem no Intr.
- O vinculo por e-mail precisa ser validado com colaboradores reais.
- A exibicao de pagamentos depende do colaborador do Intr estar corretamente vinculado ao usuario do Colab.
- Falta fluxo de autoatendimento ou solicitacoes do colaborador, caso isso entre no escopo.
