# Modulo Colab

## Papel

O Colab e o portal individual do colaborador. Ele usa o e-mail do usuario autenticado para encontrar o cadastro financeiro em `gkit_flex_colaboradores` e exibir perfil, beneficios, comissoes, pagamentos e documentos derivados do GKIT Flex.

## Funcionalidades prontas

- Cockpit individual.
- Pagamentos derivados do contas a pagar do GKIT Flex.
- Comissoes calculadas por carteira no GKIT Flex.
- Beneficios cadastrados no complemento financeiro do colaborador.
- Documentos demonstrativos gerados a partir de pagamentos e comissoes.
- Perfil do colaborador.

## Telas principais

- `/modulos/colab`
- `/modulos/colab/pagamentos`
- `/modulos/colab/comissoes`
- `/modulos/colab/beneficios`
- `/modulos/colab/documentos`
- `/modulos/colab/perfil`

## Base tecnica

- Cadastro: `public.gkit_flex_colaboradores`.
- Comissoes: `public.comissao_resumos` e `public.comissao_execucoes`.
- Pagamentos: `public.contas_pagar_itens`.
- Rotas: `app/modulos/colab/*`.
- Dados: `features/colab/queries.ts`.
- Componentes: `features/colab/components.tsx`.

## Pontos de atencao

- O vinculo depende do e-mail do usuario Core estar associado ao colaborador em `gkit_flex_colaboradores`.
- Comissoes sao associadas pela carteira do colaborador; se a carteira estiver inconsistente com a carteira da execucao de comissoes, o historico aparece vazio.
- Documentos ainda sao demonstrativos derivados, nao anexos reais.
