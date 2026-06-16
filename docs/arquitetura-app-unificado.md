# Arquitetura do app unificado GKIT

## Decisao

O `gkli-core` passa a ser a base da suite unificada. Os antigos apps continuam existindo como referencia e fallback durante a transicao, mas a experiencia integrada nasce dentro do Core em rotas de modulo.

## Rotas

- `/plataforma`: painel principal autenticado.
- `/admin`: administracao do Core.
- `/modulos/painel`: painel modular sem menu lateral.
- `/modulos/crm`: cockpit e telas iniciais do CRM.
- `/modulos/ciclo`: cockpit e telas iniciais do Ciclo.
- `/modulos/intr`: cockpit e colaboradores da Intranet.
- `/modulos/colab`: portal individual do colaborador, sem menu lateral.

## Controle de acesso

O Core continua sendo a autoridade de acesso:

- `security.usuarios` valida o usuario ativo.
- `core.apps` define os modulos ativos.
- `security.usuario_app_acessos` libera modulos por usuario.
- `security.perfis`, `security.perfil_permissoes` e `security.permissoes` mantem permissoes finas.

O helper central e `requireModuleAccess(codigo)`, usado pelos modulos internos para impedir acesso solto.

## Banco de dados

Os schemas continuam separados:

- `core`: apps, carteiras e configuracoes centrais.
- `security`: usuarios, perfis, permissoes e acessos.
- `audit`: eventos.
- `crm`: entidades comerciais.
- `ciclo`: entidades de governanca/cliente.
- `gkli_intr` e views publicas `gkli_intr_*`: intranet e portal do colaborador.

## UI/UX

O padrao visual base e o `gkli-intr`: paleta roxa/cinza, surfaces brancas, cards operacionais e cabecalhos com gradiente.

CRM, Ciclo, Intr e Core seguem experiencia operacional. Painel e Colab preservam caracteristicas proprias sem menu lateral.

## Transicao

A migracao deve continuar modulo por modulo:

1. Manter as rotas atuais dos apps antigos enquanto o Core unificado ganha paridade.
2. Migrar primeiro as telas de leitura e dashboards.
3. Migrar acoes/formularios depois de validar permissoes e auditoria.
4. Ao atingir paridade funcional, trocar os destinos externos por rotas internas no Core.
5. Desativar deployments antigos somente depois de validacao em producao.
