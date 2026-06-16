# GKIT Core - Especificacao tecnica

## Stack

- Next.js 16.2.6 com App Router.
- React 19.2.1.
- Supabase SSR e Supabase JS.
- TypeScript.

## Scripts

- `npm run dev`: sobe em `3005` com Turbopack.
- `npm run build`: build de producao.
- `npm run typecheck`: TypeScript sem emissao.
- `npm run check:supabase`: checagem de tabelas/schemas.
- `npm run bootstrap:admin`: bootstrap administrativo.

## Schemas Supabase

- `core`: apps, carteiras e entidades globais.
- `security`: usuarios, acessos, perfis e permissoes.
- `audit`: eventos de auditoria.
- `crm`: dados funcionais do CRM.
- `ciclo`: dados funcionais do Ciclo.
- `gkli_intr`: dados funcionais da Intranet e base do Colab.

## Arquitetura de autenticacao

- Sessao e mantida via Supabase SSR em `lib/supabase`.
- `proxy.ts` atualiza cookies/sessao.
- `lib/auth/platform.ts` resolve contexto de plataforma e apps disponiveis.
- `lib/auth/permissions.ts` resolve permissoes administrativas.
- `requireModuleAccess(codigo)` e a funcao padrao para proteger modulos pelo Core.

## Contratos de dados importantes

- `core.apps.codigo` e o identificador canonico de app.
- `security.usuarios.id` deve bater com `auth.users.id`.
- `security.usuario_app_acessos.usuario_id` + `app_id` define acesso por app.
- `security.usuario_carteiras` define escopo operacional.

## Seeds e SQL

- `sql/00_gkli_core_clean_bootstrap.sql`: bootstrap completo.
- `sql/02_admin_core_p0_3.sql`: seeds, views e permissoes REST.
- `sql/03_crm_p1.sql`: schema CRM.
- `sql/04_ciclo_p1.sql`: schema Ciclo.
- `sql/05_intr_colab_p1.sql`: schema Intr/Colab.
- `sql/07_intr_receitas_comissoes.sql`: receitas, views de cockpit e suporte a comissoes vinculadas.
- `sql/08_intr_agenda_pagamentos.sql`: agenda recorrente de pagamentos e geracao de previstos.
- `sql/09_intr_fechamentos_comissoes.sql`: fechamentos mensais, vinculo de pagamentos/comissoes ao fechamento e views consolidadas.
- `sql/10_intr_permissoes_finas.sql`: permissoes granulares para colaboradores, times, pagamentos, agenda, fechamentos e demais dominios do Intr.

## Validacao

- `npm run check:supabase`: aprovado em 2026-05-21, com 4 apps ativos em `core.apps`.
- `npm run typecheck`: aprovado em 2026-05-21.
- `npm run lint`: aprovado em 2026-05-21.
- `npm run build`: aprovado em 2026-05-21.
- Core API validada com apps `ciclo`, `crm`, `intr`, `colab` ativos e ordenados por `core.apps.ordem`.
- Usuario temporario de teste validado no Auth, em `security.usuarios` e com 4 vinculos ativos em `security.usuario_app_acessos`; removido apos a validacao.
- Login real no navegador local ficou bloqueado quando o servidor de desenvolvimento foi iniciado sem permissao de rede para chamar o Supabase; o backend Supabase validou as credenciais corretamente.
- `npm run typecheck`, `npm run lint` e `npm run build`: aprovados em 2026-05-22 apos unificacao operacional dos modulos.
- Build atual aprovado em 2026-05-24 e gera 81 rotas no App Router.

## Observacoes

- Service role deve ficar restrita ao Core e scripts administrativos.
- Apps operacionais devem usar chaves publicas e RLS, salvo rotas server-side realmente administrativas.
- As migrations `07`, `08`, `09` e `10` precisam ser aplicadas no Supabase antes de operar receitas, agenda de pagamentos, fechamentos e permissoes granulares em producao.
- O padrao visual atual usa `features/shared/module-shell.tsx` para CRM, Ciclo e Intr, com menu lateral fixo, grupos recolhiveis e rolagem interna no conteudo.
- Colab e Painel seguem a mesma estetica, mas sem menu lateral.
- A tipografia foi revisada para reduzir negrito; a hierarquia visual deve priorizar cor, espacamento, bordas, superficie e tamanho.
