# GKLI Core - Especificacao funcional

## Papel do app

O GKLI Core e a fonte central de identidade, acesso, carteiras, perfis, permissoes e modulos da plataforma GKLI. Nenhum aplicativo operacional deve decidir sozinho se um usuario pode entrar: o Core determina o usuario ativo e os aplicativos liberados para ele.

## Publico

- Administrador global.
- Administrador de carteira.
- Gestores autorizados a consultar modulos e indicadores consolidados.

## Funcionalidades principais

- Login central com Supabase Auth.
- Painel administrativo em `/admin`.
- Cadastro e edicao de usuarios em `security.usuarios`.
- Vinculo de usuarios a apps em `security.usuario_app_acessos`.
- Vinculo de usuarios a carteiras em `security.usuario_carteiras`.
- Cadastro e edicao de apps em `core.apps`.
- Cadastro e edicao de perfis e permissoes.
- Auditoria administrativa em `audit.eventos`.
- Plataforma de entrada em `/plataforma`, exibindo modulos conforme acesso.
- Modulos operacionais nativos para `crm`, `ciclo`, `intr` e `colab`.
- CRM com oportunidades, empresas, contatos, propostas, atividades e interacoes.
- Ciclo com cliente, onboarding, regularidade, documentos, ocorrencias, contratos, atas e Cockpit Cliente Integral.
- Intr com colaboradores, times, receitas, comissoes, pagamentos, agenda de pagamentos e fechamentos mensais.
- Colab como portal individual do colaborador, alimentado pelo Intr.

## Documentacao por modulo

- `docs/modulos/core.md`
- `docs/modulos/crm.md`
- `docs/modulos/ciclo.md`
- `docs/modulos/intr.md`
- `docs/modulos/colab.md`
- `docs/modulos/painel.md`

## Apps controlados

Atualmente o Core registra e controla:

- `ciclo`
- `crm`
- `intr`
- `colab`

## Regra de acesso

- Usuario precisa existir no Supabase Auth.
- Usuario precisa existir em `security.usuarios`.
- `security.usuarios.status` precisa ser `ativo`.
- Usuario `admin_global` acessa todos os modulos ativos.
- Demais usuarios acessam apenas apps com vinculo ativo em `security.usuario_app_acessos`.

## Fora de escopo atual

- Migracao de dados antigos.
- Documentos reais no Colab; hoje sao demonstrativos derivados de pagamentos e comissoes.
- Reembolsos, documentos internos e comunicados operacionais completos no Intr.
- Cobranca, que permanece independente.

## Estado validado

- Build aprovado em 2026-05-21.
- Base central validada em `ozmpzuarwkkeopnaurlp`.
- Apps ativos controlados pelo Core: `ciclo`, `crm`, `intr`, `colab`.
- Usuario temporario de teste criado apenas para validacao, com acesso aos 4 apps ativos, e removido ao final.
- Plataforma ajustada para exibir os modulos na ordem definida no Core e com resumo dinamico dos apps liberados.
- Build aprovado em 2026-05-22 com 83 rotas no app unificado naquele marco.
- Intr passou a concentrar receitas, comissoes, agenda de pagamentos, pagamentos previstos e fechamentos mensais.
- Colab consome perfil, pagamentos, comissoes, beneficios leves e documentos derivados do schema `gkli_intr`.
- Revisao UX/UI aplicada em 2026-05-24: marca visual atualizada, favicon, menus recolhiveis, telas desktop com rolagem interna e tipografia mais leve.
- Build aprovado em 2026-05-24 com 81 rotas no app unificado.
