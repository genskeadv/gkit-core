# Modulo Core

## Papel

O Core e a fonte de identidade, acesso, perfis, permissoes, carteiras e apps da GKIT Suite. Todo modulo operacional depende dele para saber se o usuario pode entrar e quais acoes pode executar.

## Funcionalidades prontas

- Login central com Supabase Auth.
- Plataforma de entrada em `/plataforma`.
- Administracao em `/admin`.
- Usuarios, carteiras, perfis, permissoes, apps e auditoria administrativa.
- Controle de acesso por `security.usuario_app_acessos`.
- Controle de permissoes por `security.perfil_permissoes`.
- Acesso administrativo filtrado por permissoes como `admin.dashboard.read`, `admin.usuarios.read` e equivalentes de escrita.

## Telas principais

- `/login`
- `/plataforma`
- `/admin`
- `/admin/usuarios`
- `/admin/carteiras`
- `/admin/perfis`
- `/admin/permissoes`
- `/admin/apps`
- `/admin/auditoria`

## Base tecnica

- Schemas: `core`, `security`, `audit`.
- Autenticacao: `lib/supabase/*`, `proxy.ts`, `lib/auth/platform.ts`.
- Permissoes: `lib/auth/permissions.ts`.
- Layout administrativo: `features/admin/components/AdminShell.tsx`.

## UX/UI atual

- Menu lateral fixo no desktop.
- Conteudo administrativo com rolagem interna, evitando rolagem do browser.
- Blocos do menu recolhiveis.
- Tipografia leve; hierarquia visual baseada em cor, espaco, superficie e borda.

## Pontos fracos e atencao

- Falta uma auditoria operacional por modulo; hoje a auditoria estruturada e principalmente administrativa.
- Criacao de usuario ainda depende de fluxo correto no Supabase Auth e convite/senha.
- Permissoes precisam ser validadas com usuarios reais por perfil antes de producao.
- As telas administrativas ainda podem ganhar filtros mais ricos em listas grandes.

