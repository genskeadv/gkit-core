# Manual de uso - Core

## Para que serve

O Core e a base administrativa da plataforma. Ele controla usuarios, perfis,
permissoes, carteiras, times, aplicativos disponiveis e auditoria. Os demais
modulos dependem dessas configuracoes para liberar acesso, filtrar dados e
registrar responsabilidades.

## Quem usa

- Administradores da plataforma.
- Gestores responsaveis por liberar acesso a modulos.
- Lideres que organizam carteiras e times.
- Suporte interno que precisa auditar acessos ou alteracoes.

## Como acessar

- Plataforma: `/plataforma`
- Administracao: `/admin`
- Aplicativos: `/admin/apps`
- Usuarios: `/admin/usuarios`
- Perfis: `/admin/perfis`
- Permissoes: `/admin/permissoes`
- Carteiras: `/admin/carteiras`
- Times: `/admin/times`
- Tipos de usuario: `/admin/tipos-usuario`
- Auditoria: `/admin/auditoria`

## Visao rapida do fluxo

1. Cadastre ou revise o usuario.
2. Associe o usuario ao perfil correto.
3. Libere os aplicativos que ele pode acessar.
4. Vincule carteiras e times quando a operacao exigir segmentacao.
5. Revise a auditoria quando houver duvida sobre acesso ou alteracao.

## Telas principais

### Plataforma

E a porta de entrada para os modulos. O usuario so visualiza os aplicativos
liberados para seu perfil e seus acessos.

### Usuarios

Use para criar, revisar ou desativar usuarios. Antes de liberar um usuario,
confirme nome, e-mail, tipo de usuario, status e vinculos operacionais.

### Perfis

Use para agrupar permissoes por papel de trabalho. Exemplo: administrador,
gestor, operador comercial, operador financeiro ou consulta.

### Permissoes

Use para controlar acoes especificas dentro dos modulos. Uma permissao pode
liberar visualizacao, cadastro, edicao, importacao, aprovacao ou auditoria.

### Aplicativos

Use para controlar quais modulos estao disponiveis na plataforma. O acesso ao
aplicativo deve estar coerente com o perfil do usuario.

### Carteiras

Use para organizar clientes por carteira de atendimento, operacao ou gestao.
Carteiras sao reutilizadas por modulos como Ciclo, FAT, FLEX, DIR e relatorios.

### Times

Use para agrupar usuarios por area ou equipe. Times ajudam na organizacao de
responsaveis, filtros e visoes de gestao.

### Auditoria

Use para investigar eventos relevantes: alteracoes cadastrais, acessos, acoes
administrativas e ajustes sensiveis.

## Rotina recomendada

1. Ao entrar um novo usuario, cadastre no Core antes de liberar modulos.
2. Defina perfil e permissoes pelo papel real de trabalho.
3. Libere apenas os aplicativos necessarios.
4. Vincule carteira e time quando o usuario operar clientes.
5. Revise periodicamente usuarios inativos e perfis com acesso amplo.

## Boas praticas

- Evite criar perfis muito parecidos sem necessidade.
- Prefira ajustar permissoes no perfil em vez de excecoes por usuario.
- Desative acessos de usuarios que deixaram a operacao.
- Use nomes claros para carteiras e times.
- Consulte auditoria antes de refazer uma alteracao sensivel.

## Dependencias

O Core alimenta todos os demais modulos. Se um usuario nao visualiza um modulo,
nao encontra uma carteira ou nao consegue executar uma acao, a primeira checagem
deve ser feita em usuarios, perfis, permissoes e aplicativos.
