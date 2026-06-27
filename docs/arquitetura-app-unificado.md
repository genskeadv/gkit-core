# Arquitetura do app unificado GKIT

## Decisao

O `gkit-core` e a base da suite unificada. Os modulos operacionais ativos vivem dentro do Core em rotas de modulo, compartilhando autenticacao, autorizacao, layout base e convencoes de acesso.

## Rotas principais

- `/plataforma`: entrada autenticada e lista de modulos ativos.
- `/admin`: administracao do Core.
- `/modulos/ciclo`: operacao de clientes e governanca.
- `/modulos/colab`: portal individual do colaborador.
- `/modulos/gkit-ate`: atendimentos e tarefas.
- `/modulos/gkit-dir`: modulo diretivo.
- `/modulos/gkit-flex`: financeiro operacional canonico.
- `/modulos/gkit-new`: novos negocios.
- `/modulos/gkit-performa`: performance operacional.

Rotas de modulos removidos redirecionam para `/plataforma`.

## Controle de acesso

O Core e a autoridade de acesso:

- `security.usuarios` valida o usuario ativo.
- `core.apps` define modulos ativos.
- `security.usuario_app_acessos` libera modulos por usuario.
- `security.usuario_carteiras` define escopo por carteira.
- `security.perfis`, `security.perfil_permissoes` e `security.permissoes` mantem permissoes finas.

O helper central e `requireModuleAccess(codigo)`.

## Banco de dados

Schemas vivos principais:

- `core`: apps, carteiras e configuracoes centrais.
- `security`: usuarios, perfis, permissoes e acessos.
- `audit`: eventos.
- `ciclo`: entidades de governanca/cliente.
- `gkit_ate`: atendimentos e tarefas.
- `gkit_new`: novos negocios.
- `gkit_performa`: rankings gravados.
- `public`: tabelas operacionais publicas do GKIT Flex e views/tabelas compartilhadas.

Schemas legados removidos: `crm`, `flex` antigo e `gkli_intr`.

## UI/UX

A plataforma usa uma linguagem operacional comum: navegacao previsivel, telas densas mas legiveis, cards apenas para itens ou paineis reais, e foco em execucao. Modulos com fluxo proprio podem adaptar a navegacao, desde que preservem acesso e hierarquia visual da suite.
