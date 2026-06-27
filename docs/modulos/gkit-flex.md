# Modulo GKIT Flex

## Papel

O GKIT Flex e o modulo financeiro operacional canonico da suite. Ele substitui o Flex antigo, FIX, DIN e INTR financeiro.

## Funcionalidades prontas

- Dashboard financeiro.
- Cadastros operacionais.
- Cadastro financeiro de colaboradores.
- Calculo e auditoria de comissoes.
- Contas a pagar por competencia.
- Auditoria de importacoes, comissoes e snapshots.
- Integracao com Colab para perfil, beneficios, pagamentos e comissoes.

## Telas principais

- `/modulos/gkit-flex`
- `/modulos/gkit-flex/cadastros`
- `/modulos/gkit-flex/colaboradores`
- `/modulos/gkit-flex/comissoes`
- `/modulos/gkit-flex/contas-a-pagar`
- `/modulos/gkit-flex/auditoria`

## Base tecnica

- Rotas: `app/modulos/gkit-flex/*`.
- APIs: `app/api/gkit-flex/*`.
- Codigo: `features/gkit-flex/*`.
- Cadastro de colaboradores: `public.gkit_flex_colaboradores`.
- Comissoes: `public.comissao_competencias`, `public.comissao_execucoes`, `public.comissao_resumos`, `public.comissao_lancamentos`, `public.comissao_auditoria`.
- Contas a pagar: `public.contas_pagar_competencias`, `public.contas_pagar_itens`, `public.contas_pagar_snapshots`.

## Pontos de atencao

- Fechamento mensal deve ser validado com usuarios reais antes de producao.
- Colab depende da carteira do colaborador para encontrar comissoes publicadas.
- O pacote antigo `flex` foi removido; novas evolucoes devem ficar sempre em `gkit-flex`.
