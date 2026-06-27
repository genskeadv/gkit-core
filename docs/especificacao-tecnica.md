# GKIT Core - Especificacao tecnica

## Stack

- Next.js 16.2.9 com App Router.
- React.
- Supabase SSR e Supabase JS.
- TypeScript.
- Testes com `tsx --test`.

## Scripts

- `npm run dev`: sobe em `3005`.
- `npm run build`: build de producao.
- `npm test`: executa testes em `tests/**/*.test.ts`.
- Typecheck estrito usado na validacao: `npx tsc --noEmit --noUnusedLocals --noUnusedParameters --pretty false`.
- Supabase lint usado na validacao: `npx -y supabase db lint --linked --level warning`.
- Supabase advisors usado na validacao: `npx -y supabase db advisors --linked`.

## Schemas Supabase

- `core`: apps, carteiras e entidades globais.
- `security`: usuarios, acessos, perfis e permissoes.
- `audit`: eventos de auditoria.
- `ciclo`: dados funcionais do Ciclo.
- `gkit_ate`: atendimentos e tarefas.
- `gkit_new`: novos negocios.
- `gkit_performa`: rankings gravados.
- `extensions`: extensoes Postgres, incluindo `unaccent`.
- `public`: tabelas operacionais publicas do GKIT Flex e objetos compartilhados.

Schemas removidos: `crm`, `flex` antigo e `gkli_intr`.

## Arquitetura de autenticacao

- Sessao e mantida via Supabase SSR em `lib/supabase`.
- `proxy.ts` atualiza cookies/sessao e redireciona rotas legadas removidas.
- `lib/auth/platform.ts` resolve contexto de plataforma e apps disponiveis.
- `lib/auth/permissions.ts` resolve permissoes administrativas.
- `lib/auth/retired-modules.ts` centraliza codigos e paths de modulos aposentados.
- `requireModuleAccess(codigo)` e a funcao padrao para proteger modulos pelo Core.

## Contratos de dados importantes

- `core.apps.codigo` e o identificador canonico de app.
- `security.usuarios.id` deve bater com `auth.users.id`.
- `security.usuario_app_acessos.usuario_id` + `app_id` define acesso por app.
- `security.usuario_carteiras` define escopo operacional.
- Rotas web canonicas usam hifen quando aplicavel, como `gkit-flex`, enquanto codigos internos podem usar underscore, como `gkit_flex`.

## SQL operacional vivo

- `sql/24` a `sql/28`: GKIT New.
- `sql/40` a `sql/42`: Ciclo.
- `sql/45` e `sql/46`: GKIT ATE.
- `sql/49`: app externo/canonico GKIT Flex.
- `sql/50`: GKIT DIR.
- `sql/52` e `sql/53`: GKIT Performa.
- `sql/54` a `sql/60`: hardening e limpeza final dos modulos aposentados.

## Validacao atual

- `npm run build`: aprovado com 98 rotas.
- `npx tsc --noEmit --noUnusedLocals --noUnusedParameters --pretty false`: aprovado.
- `npm test`: aprovado com testes de modulos aposentados.
- `supabase db lint --linked --level warning`: sem erros de schema.
- `supabase db advisors --linked`: resta apenas `auth_leaked_password_protection`, configuracao do Supabase Auth.

## Observacoes

- Service role deve ficar restrita a rotas server-side e scripts administrativos.
- Apps operacionais devem usar RLS e permissoes finas sempre que expostos a usuario final.
- Novas evolucoes financeiras devem entrar em `gkit-flex`, nao recriar `flex`, `fix`, `din` ou `intr`.
