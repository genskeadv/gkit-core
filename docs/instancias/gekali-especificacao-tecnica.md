# Especificacao tecnica - transporte do GKIT Core para GEKALI

## Arquitetura alvo

Instancia GEKALI com:

- Repositorio/pasta de codigo separada.
- Projeto Supabase separado.
- Variaveis de ambiente separadas.
- Deploy separado.
- Sem compartilhamento de dados com a instancia Genske.

Modelo recomendado de pastas:

```text
C:\Users\Genske\Documents\
  gkit-core\
  gekali-core\
```

## Stack

- Next.js 16.
- React.
- TypeScript.
- Supabase Auth.
- Supabase Postgres.
- Supabase RLS.
- `@supabase/ssr`.
- `@supabase/supabase-js`.
- Importacao de planilhas via `xlsx` e `exceljs`.

## Itens que devem ser copiados

Copiar para a nova pasta:

- `app/`
- `features/`
- `lib/`
- `public/`
- `scripts/`
- `sql/`
- `supabase/`
- `tests/`
- `docs/`
- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `next.config.ts`
- `postcss.config.mjs`
- `eslint.config.mjs`
- `proxy.ts`
- `vercel.json`
- `.gitignore`
- `.env.example`
- `README.md`

Nao copiar:

- `.git/`
- `.next/`
- `node_modules/`
- `.vercel/`
- `tmp/`
- `.env.local`
- `*.log`
- `tsconfig.tsbuildinfo`
- `.codex/`
- `.agents/`, salvo se a nova instancia tambem precisar das instrucoes locais de agente.

## Variaveis de ambiente

Criar um `.env.local` novo na pasta GEKALI:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<projeto-gekali>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key-da-gekali>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key-da-gekali>
```

Nao reutilizar chaves da instancia Genske.

## Ordem tecnica de implantacao

### 1. Copiar o codigo

Exemplo em PowerShell:

```powershell
robocopy C:\Users\Genske\Documents\gkit-core C:\Users\Genske\Documents\gekali-core /E /XD .git .next node_modules .vercel tmp .codex /XF .env.local *.log tsconfig.tsbuildinfo
```

Depois:

```powershell
cd C:\Users\Genske\Documents\gekali-core
npm install
```

### 2. Criar o Supabase da GEKALI

Criar projeto Supabase novo.

No SQL Editor, executar primeiro:

```text
sql/63_bootstrap_nova_instancia_supabase.sql
```

Esse script cria:

- schemas `core`, `security`, `audit`;
- tabelas essenciais de usuarios, apps, permissoes, perfis, carteiras e times;
- funcoes `security.is_admin_global()` e `security.usuario_tem_permissao()`;
- views administrativas usadas pelo Admin Core;
- seeds basicos de apps, permissoes e perfis.

### 3. Aplicar migrations e scripts de modulo

Depois do bootstrap, aplicar as migrations em `supabase/migrations`.

Se estiver usando Supabase CLI vinculado ao projeto GEKALI:

```powershell
npx supabase link --project-ref <project-ref-gekali>
npx supabase db push
```

Se for executar manualmente, manter a ordem cronologica dos arquivos em `supabase/migrations`.

Scripts em `sql/` que nao estao dentro de `supabase/migrations` devem ser avaliados e aplicados conforme os modulos que a GEKALI vai ativar. Exemplos relevantes:

- `sql/24_gkit_new_bootstrap.sql`
- `sql/45_gkit_ate_bootstrap.sql`
- `sql/49_gkit_flex_external_app.sql`
- `sql/52_gkit_performa_module.sql`
- `sql/53_gkit_performa_rankings.sql`
- `sql/61_gkit_jur_module.sql`
- `sql/62_gkit_flex_previsoes.sql`

Observacao: alguns desses scripts podem ja ter equivalente em migration. Antes de aplicar manualmente, conferir se a tabela/app/permissao ja existe. Os scripts foram escritos majoritariamente com `if not exists`/`on conflict`, mas a revisao ainda e recomendada.

### 4. Criar primeiro admin

Criar usuario no Supabase Auth.

Depois, executar o bloco comentado no final de `sql/63_bootstrap_nova_instancia_supabase.sql`, trocando:

- UUID do usuario;
- nome;
- email.

O usuario deve receber:

- `security.usuarios.tipo = 'admin_global'`;
- perfil `admin_global`;
- acesso aos apps ativos.

### 5. Validar localmente

Na pasta GEKALI:

```powershell
npm test
npm run build
npm run dev
```

Abrir:

```text
http://localhost:3005
```

Validar login e Admin Core.

## Ajustes de marca GEKALI

Pontos provaveis:

- `public/` para logo, favicon e assets.
- `app/layout.tsx` para metadata.
- `features/shared/brand-logo.tsx` para marca visual compartilhada.
- `features/gkit-flex/ui/AppFrame.tsx` se o Flex precisar exibir identidade propria.
- Textos de README/docs.

Evitar alterar regras de negocio durante o primeiro transporte. Primeiro fazer a instancia subir; depois customizar.

## Supabase Data API

Se rotas com schemas privados retornarem erro `PGRST106 Invalid schema`, conferir no Supabase:

- Data API / exposed schemas;
- schemas `core`, `security`, `audit`;
- schemas dos modulos usados, como `gkit_jur`, `gkit_ate`, `gkit_new`, `gkit_performa`.

O app usa service role em muitas rotas server-side, mas a exposicao de schema ainda pode afetar consultas via PostgREST.

## Checklist de verificacao

- `.env.local` aponta para Supabase GEKALI.
- `npm install` concluiu sem erro.
- `npm test` passou.
- `npm run build` passou.
- `core.apps` possui apps esperados.
- `security.permissoes` possui permissoes esperadas.
- `security.perfis` possui `admin_global`.
- Primeiro admin existe em `auth.users` e `security.usuarios`.
- Primeiro admin tem perfil `admin_global`.
- Primeiro admin acessa `/plataforma` e `/admin`.
- Modulos ativos abrem sem erro de schema.

## Riscos tecnicos

- Migrations atuais pressupunham parte do Core ja existente; por isso o bootstrap deve vir primeiro.
- Alguns scripts historicos em `sql/` podem duplicar intencoes de migrations mais novas.
- Copiar codigo separado cria divergencia futura; correcoes feitas no Genske precisarao ser replicadas manualmente na GEKALI, quando aplicavel.
- Service role nunca deve ir para o browser; manter apenas em `.env.local`/ambiente server.
- Dados reais da Genske nao devem ser exportados para a GEKALI sem revisao juridica/operacional.

## Comando de inventario rapido

Na nova instancia, estes comandos ajudam outro Codex a se localizar:

```powershell
rg --files
npm test
npm run build
rg -n "create schema|create table|core.apps|security.usuarios|gkit_flex" sql supabase\migrations
```
