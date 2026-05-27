# Modulo Painel

## Papel

O Painel e uma entrada unificada alternativa, sem menu lateral, com atalhos para os modulos liberados pelo Core.

## Funcionalidades prontas

- Exibe Core para usuarios com permissao administrativa.
- Exibe CRM, Ciclo, Intr e Colab conforme acesso ativo.
- Publica atalhos por grupo funcional.
- Mostra leitura executiva do fluxo CRM -> Ciclo -> Intr -> Colab.
- Mostra pendencias de migracao quando existirem.

## Telas principais

- `/modulos/painel`
- `/plataforma`

## Base tecnica

- Usa `requirePlatformContext`.
- Filtra acessos por `security.usuario_app_acessos`.
- Usa permissao `admin.dashboard.read` para exibir Core.

## UX/UI atual

- Sem menu lateral.
- Cards compactos.
- Blocos executivos com modulos ativos, atalhos publicados e pontos de atencao.
- Mapa visual da esteira operacional da suite.
- Layout ajustado para caber no viewport desktop sem rolagem do browser sempre que possivel.
- Identidade visual alinhada ao restante da suite.

## Pontos fracos e atencao

- Pode ficar redundante com `/plataforma`; manter os dois so faz sentido se cada um tiver papel claro.
- Pendencias exibidas no painel devem ser revisadas periodicamente para nao virar ruido.
- Atalhos precisam acompanhar novas rotas publicadas nos modulos.
