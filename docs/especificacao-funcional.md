# GKIT Core - Especificacao funcional

## Papel do app

O GKIT Core e a base central de identidade, acesso, carteiras, perfis, permissoes e modulos da plataforma GKIT. Nenhum modulo operacional decide sozinho se um usuario pode entrar: o Core valida usuario ativo, apps liberados e permissoes.

## Funcionalidades principais

- Login central com Supabase Auth.
- Plataforma de entrada em `/plataforma`.
- Administracao em `/admin`.
- Cadastro e edicao de usuarios, carteiras, apps, perfis e permissoes.
- Auditoria administrativa em `audit.eventos`.
- Modulos operacionais ativos exibidos conforme acesso.

## Modulos ativos

- `ciclo`: gestao operacional de clientes, documentos, regularidade, ocorrencias, contratos, atas e cockpit.
- `colab`: portal individual do colaborador, conectado ao cadastro e historico publicados pelo GKIT Flex.
- `gkit_ate`: atendimento consultivo e tarefas importadas/operadas a partir do fluxo ASTREA.
- `gkit_dir`: modulo diretivo.
- `gkit_flex`: financeiro operacional canonico, com comissoes, contas a pagar, cadastros, auditoria e dashboard.
- `gkit_new`: novos negocios, oportunidades, contatos, tarefas e gestao.
- `gkit_performa`: ranking de performance operacional a partir da agenda.

## Modulos removidos

Os codigos `crm`, `din`, `fix`, `flex` antigo e `intr` foram removidos do banco, do menu e das rotas executaveis. Qualquer acesso legado a `/modulos/crm`, `/modulos/din`, `/modulos/fix`, `/modulos/flex` ou `/modulos/intr` redireciona para `/plataforma`.

## Regra de acesso

- Usuario precisa existir no Supabase Auth.
- Usuario precisa existir em `security.usuarios`.
- `security.usuarios.status` precisa ser `ativo`.
- Usuario `admin_global` acessa todos os modulos ativos.
- Demais usuarios acessam apenas apps com vinculo ativo em `security.usuario_app_acessos`.
- Permissoes finas continuam em `security.permissoes` e `security.perfil_permissoes`.

## Documentacao por modulo

- `docs/modulos/core.md`
- `docs/modulos/ciclo.md`
- `docs/modulos/colab.md`
- `docs/modulos/gkit-flex.md`
- `docs/modulos/gkit-new.md`
- `docs/modulos/gkit-performa.md`
- `docs/modulos/painel.md`

## Estado validado

- Build aprovado apos limpeza fisica dos modulos removidos.
- Banco com schemas legados removidos: `crm`, `flex` antigo e `gkli_intr`.
- Build atual com 98 rotas no app unificado.
- `supabase db lint --linked --level warning` sem erros de schema.
- Advisor restante conhecido: leaked password protection desativado no Supabase Auth, ajuste feito no painel/config.
