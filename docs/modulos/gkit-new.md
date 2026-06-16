# Modulo GKIT New

## Papel

O GKIT New e o novo CRM 2.0 da GKIT Suite. Ele nasce como substituto funcional do CRM atual, mas com codigo, rotas, permissoes e schema novos.

O modulo controla a captacao comercial de forma enxuta: clientes, contatos, oportunidades e tarefas automaticas de workflow. A aprovacao de uma oportunidade e o evento que torna o cliente ativo.

## Principios

- Produto novo, implementacao nova.
- Rota canonica: `/modulos/gkit-new`.
- Codigo canonico: `features/gkit-new`.
- Schema canonico: `gkit_new`.
- Codigo do app no Core: `gkit_new` porque `core.apps.codigo` nao aceita hifen.
- Permissoes canonicas: `gkit_new.*`.
- Autenticacao e autorizacao continuam pelo Core.
- Usuarios, perfis, acessos e responsaveis de tarefas continuam vindo do Core.
- O modulo nao usa a base do Ciclo como cadastro comercial.
- O modulo nao reaproveita tabelas, rotas, actions, queries ou componentes do CRM atual.
- Nao existe entidade separada de proposta. Proposta e uma fase/status da oportunidade.

## Instalação no Supabase

Depois de executar os scripts SQL do módulo, o schema `gkit_new` precisa estar exposto na API do projeto:

1. Abrir Supabase > Project Settings > API.
2. Em Exposed schemas, adicionar `gkit_new`.
3. Salvar a configuração.
4. Recarregar o app.

Sem essa etapa, o PostgREST retorna `PGRST106 Invalid schema: gkit_new` e o app nao consegue ler clientes, oportunidades, tarefas ou dados demo.

## Publico

- Administrador global.
- Gestor comercial.
- Operador comercial.
- Usuario de leitura comercial.

## Objetivos funcionais

- Cadastrar clientes por nome e documento.
- Aceitar documento CPF ou CNPJ, sempre obrigatorio.
- Garantir chave unica por documento normalizado.
- Classificar cliente automaticamente como Prospecto ou Ativo.
- Cadastrar contatos independentes.
- Vincular contatos a clientes em relacao N para N.
- Cadastrar oportunidades por cliente.
- Exigir que o contato da oportunidade esteja vinculado ao cliente escolhido.
- Controlar status comercial da oportunidade.
- Criar tarefas automaticas ao salvar uma oportunidade, a partir de modelos de workflow.
- Atribuir tarefas a responsaveis da base de usuarios do Core.
- Oferecer cockpit simples para pipeline, tarefas e clientes ativos/prospectos.

## Entidades

### Cliente

Representa qualquer organizacao ou pessoa no CRM 2.0.

Campos:

- `id`
- `nome`
- `documento`
- `documento_tipo`: `cpf` ou `cnpj`
- `documento_normalizado`
- `status`: `prospecto` ou `ativo`
- `observacoes`
- `criado_por`
- `atualizado_por`
- `created_at`
- `updated_at`

Regras:

- `nome` e obrigatorio.
- `documento` e obrigatorio.
- `documento_normalizado` deve conter somente digitos.
- CPF deve ter 11 digitos.
- CNPJ deve ter 14 digitos.
- `documento_normalizado` e chave unica do cliente.
- `status` nao deve ser editado manualmente.
- Cliente com nenhuma oportunidade aprovada fica `prospecto`.
- Cliente com uma ou mais oportunidades aprovadas fica `ativo`.
- Se todas as oportunidades aprovadas deixarem de estar aprovadas, o cliente volta para `prospecto`.

### Contato

Representa uma pessoa de relacionamento comercial.

Campos:

- `id`
- `nome`
- `descricao`
- `email`
- `celular`
- `created_at`
- `updated_at`

Regras:

- `nome` e obrigatorio.
- `email` e opcional.
- `celular` e opcional.
- Um contato pode estar vinculado a varios clientes.
- Um cliente pode ter varios contatos.
- O cadastro de contato nao duplica cliente.

### Cliente x Contato

Tabela de vinculo N para N entre clientes e contatos.

Campos:

- `id`
- `cliente_id`
- `contato_id`
- `papel`
- `principal`
- `created_at`

Regras:

- Par `cliente_id` + `contato_id` deve ser unico.
- `principal` indica contato preferencial naquele cliente.
- Um contato pode ser principal em mais de um cliente.
- A exclusao de vinculo nao exclui o contato.

### Oportunidade

Representa uma negociacao comercial. Nao existe entidade separada de proposta.

Campos:

- `id`
- `cliente_id`
- `contato_id`
- `data`
- `descricao`
- `tipo`: `mensal` ou `pontual`
- `valor`
- `escopo`
- `status`: `nova`, `proposta_enviada`, `em_negociacao`, `aprovada`, `encerrada`
- `motivo_encerramento_antecipado`
- `responsavel_id`
- `criado_por`
- `atualizado_por`
- `created_at`
- `updated_at`

Regras:

- `cliente_id` e obrigatorio.
- `data` e obrigatoria e pode ser futura.
- `descricao` e obrigatoria.
- `tipo` e obrigatorio.
- `contato_id` e obrigatorio.
- O contato selecionado precisa estar vinculado ao cliente escolhido.
- `valor` e obrigatorio e deve ser maior ou igual a zero.
- `escopo` e campo de texto livre.
- Oportunidade pode ser aprovada ou encerrada a qualquer tempo.
- Se a oportunidade for aprovada ou encerrada antes de todas as tarefas do workflow estarem concluidas, `motivo_encerramento_antecipado` e obrigatorio.
- Ao aprovar ou encerrar oportunidade antes do fim do workflow, as tarefas pendentes devem ser canceladas automaticamente.
- Se todas as tarefas do workflow ja estiverem finalizadas, o motivo e opcional.
- Ao mudar status para `aprovada`, o cliente deve ficar `ativo`.
- Ao mudar status de `aprovada` para outro status, o cliente deve ser recalculado.
- `encerrada` representa oportunidade sem continuidade ativa.

### Modelo de tarefa

Define tarefas automaticas que serao criadas quando uma oportunidade for salva.

Campos:

- `id`
- `descricao`
- `dias`
- `responsavel_id`
- `ativo`
- `ordem`
- `created_at`
- `updated_at`

Regras:

- `descricao` e obrigatoria.
- `dias` e obrigatorio e deve ser maior ou igual a zero.
- `responsavel_id` aponta para usuario do Core.
- Modelos inativos nao geram tarefas novas.
- A data da tarefa e calculada a partir da data de criacao da oportunidade, nao da data comercial da oportunidade.

### Tarefa

Representa uma pendencia operacional criada automaticamente ou manualmente.

Campos:

- `id`
- `oportunidade_id`
- `cliente_id`
- `descricao`
- `data_prevista`
- `responsavel_id`
- `status`: `pendente`, `concluida` ou `cancelada`
- `concluida_em`
- `created_at`
- `updated_at`

Regras:

- Ao salvar uma nova oportunidade, o sistema cria tarefas para todos os modelos ativos.
- `data_prevista` = `created_at` da oportunidade + `dias` do modelo.
- `responsavel_id` vem do modelo de tarefa.
- Tarefas automaticas nao devem ser duplicadas em salvamentos posteriores da mesma oportunidade.
- Tarefas podem ser concluidas pelo usuario.
- Tarefas pendentes podem ser canceladas automaticamente quando a oportunidade for aprovada ou encerrada antes do fim do workflow.

## Workflow da oportunidade

1. Usuario cria ou edita cliente.
2. Usuario cria ou vincula contato ao cliente.
3. Usuario cria oportunidade para o cliente.
4. Sistema limita o campo contato aos contatos vinculados ao cliente.
5. Usuario informa data, descricao, tipo, valor, escopo e status.
6. Ao salvar oportunidade nova, sistema cria tarefas automaticas.
7. Oportunidade pode ser aprovada ou encerrada mesmo antes do workflow terminar.
8. Se houver tarefas pendentes e o usuario aprovar ou encerrar a oportunidade, o sistema exige motivo.
9. O sistema cancela automaticamente as tarefas pendentes da oportunidade aprovada ou encerrada antes do fim do workflow.
10. Se status for `aprovada`, sistema recalcula cliente como `ativo`.
11. Se status nao for `aprovada`, sistema mantem ou recalcula cliente conforme demais oportunidades aprovadas.

## Status

### Status de cliente

- `prospecto`: cliente sem oportunidade aprovada.
- `ativo`: cliente com pelo menos uma oportunidade aprovada.

O status do cliente e sempre derivado das oportunidades. Nao deve existir campo editavel para alterar manualmente.

### Status de oportunidade

- `nova`: oportunidade recem cadastrada.
- `proposta_enviada`: proposta enviada ao cliente dentro da propria oportunidade.
- `em_negociacao`: oportunidade em negociacao ativa.
- `aprovada`: oportunidade ganha; ativa o cliente.
- `encerrada`: oportunidade encerrada sem continuidade ativa.

Transicoes:

- `aprovada` e `encerrada` podem ser aplicadas a qualquer momento.
- Se ainda houver tarefa de workflow com status `pendente`, a transicao para `aprovada` ou `encerrada` deve exigir motivo.
- Depois da justificativa, tarefas pendentes da oportunidade devem mudar para `cancelada` automaticamente.
- O motivo deve ficar registrado na oportunidade e em evento de auditoria.

## Rotas planejadas

### Cockpit

- `/modulos/gkit-new`

Entrada diaria do operador comercial. O menu deve tratar o Cockpit como acompanhamento de tarefas e rotina do operador, nao como dashboard executivo.

Deve mostrar:

- Tarefas pendentes.
- Tarefas vencidas.
- Tarefas do dia.
- Proximas tarefas.
- Oportunidades com acao pendente.
- Clientes relacionados as tarefas em aberto.

Regra de UX:

- A tela deve caber preferencialmente em uma pagina do browser, sem rolagem vertical em uso normal.
- Quando houver muitos registros, usar listas compactas com rolagem interna controlada.

### Base cadastral

Agrupa os cadastros operacionais do modulo.

#### Clientes

- `/modulos/gkit-new/clientes`
- `/modulos/gkit-new/clientes/novo`
- `/modulos/gkit-new/clientes/[id]`

Funcionalidades:

- Listar clientes.
- Filtrar por status, documento e texto.
- Criar cliente.
- Editar cliente.
- Visualizar contatos vinculados.
- Visualizar oportunidades do cliente.
- Exibir status derivado como leitura.

#### Contatos

- `/modulos/gkit-new/contatos`
- `/modulos/gkit-new/contatos/novo`
- `/modulos/gkit-new/contatos/[id]`

Funcionalidades:

- Listar contatos.
- Criar contato.
- Editar contato.
- Vincular contato a um ou mais clientes.
- Remover vinculos sem apagar o contato.

#### Oportunidades

- `/modulos/gkit-new/oportunidades`
- `/modulos/gkit-new/oportunidades/novo`
- `/modulos/gkit-new/oportunidades/[id]`

Funcionalidades:

- Listar oportunidades.
- Criar oportunidade.
- Editar oportunidade.
- Filtrar por cliente, status, tipo, data e responsavel.
- Exibir contato vinculado.
- Exibir tarefas criadas.
- Atualizar status comercial.

#### Modelos de workflow

- `/modulos/gkit-new/base/workflow`
- `/modulos/gkit-new/base/workflow/novo`
- `/modulos/gkit-new/base/workflow/[id]`

Funcionalidades:

- Listar modelos de tarefa.
- Criar modelo de tarefa.
- Editar descricao, dias, responsavel, ordem e status.
- Ativar ou inativar modelo.

### Gestao

Area de acompanhamento gerencial inicial do CRM 2.0.

- `/modulos/gkit-new/gestao`

Primeira versao implementada:

- Total de clientes.
- Prospectos.
- Clientes ativos.
- Pipeline total.
- Oportunidades por status.
- Conversao para aprovado.
- Produtividade por responsavel.
- Eventos recentes de auditoria.

Planejado para evolucao:

- Valor aprovado por periodo.
- Filtros por periodo, responsavel e status.
- Graficos compactos de evolucao do pipeline.

#### Tarefas gerenciais

- `/modulos/gkit-new/tarefas`
- `/modulos/gkit-new/tarefas/[id]`

Funcionalidades:

- Listar tarefas por responsavel, status e vencimento.
- Concluir tarefa.
- Visualizar cliente e oportunidade relacionados.

## Permissoes planejadas

- `gkit_new.dashboard.read`: acessar cockpit.
- `gkit_new.clientes.read`: consultar clientes.
- `gkit_new.clientes.write`: criar e editar clientes.
- `gkit_new.contatos.read`: consultar contatos.
- `gkit_new.contatos.write`: criar, editar e vincular contatos.
- `gkit_new.oportunidades.read`: consultar oportunidades.
- `gkit_new.oportunidades.write`: criar e editar oportunidades.
- `gkit_new.tarefas.read`: consultar tarefas.
- `gkit_new.tarefas.write`: concluir, cancelar automaticamente por fechamento antecipado ou alterar tarefas.
- `gkit_new.workflow.read`: consultar modelos de workflow.
- `gkit_new.workflow.write`: gerenciar modelos de workflow.

## Modelo tecnico planejado

Schema: `gkit_new`.

Tabelas:

- `gkit_new.clientes`
- `gkit_new.contatos`
- `gkit_new.cliente_contatos`
- `gkit_new.oportunidades`
- `gkit_new.tarefa_modelos`
- `gkit_new.tarefas`
- `gkit_new.eventos`

Views opcionais:

- `gkit_new.v_clientes_resumo`
- `gkit_new.v_oportunidades_resumo`
- `gkit_new.v_tarefas_pendentes`

Funcoes recomendadas:

- `gkit_new.normalizar_documento(text)`
- `gkit_new.tipo_documento(text)`
- `gkit_new.recalcular_status_cliente(uuid)`
- `gkit_new.criar_tarefas_oportunidade(uuid)`

Triggers recomendados:

- Ao inserir ou atualizar oportunidade: recalcular status do cliente.
- Ao mudar cliente de uma oportunidade: recalcular cliente antigo e novo.
- Ao inserir oportunidade: criar tarefas automaticas uma unica vez.
- Ao inserir ou atualizar cliente: normalizar documento.

## Regras de integridade

- Documento normalizado unico por cliente.
- Contato da oportunidade precisa existir em `cliente_contatos`.
- Oportunidade nao pode apontar para contato desvinculado do cliente.
- Tarefa automatica deve ter chave anti-duplicidade por oportunidade e modelo.
- Usuario responsavel deve existir na base do Core.
- Exclusao fisica deve ser evitada; preferir conclusao ou cancelamento quando houver historico.

## UX/UI

O modulo deve seguir o padrao visual operacional definido em `docs/design/modulos-operacionais.md`.

Diretrizes:

- Interface compacta e objetiva.
- Cockpit como primeira tela util, sem pagina de marketing.
- Menu principal com apenas tres grupos: Cockpit, Base cadastral e Gestao.
- Telas devem caber preferencialmente em uma unica pagina do browser, sem rolagem vertical no uso normal.
- Conteudos longos devem usar listas ou tabelas com rolagem interna, preservando cabecalho e acoes visiveis.
- Cards de KPI com tamanho consistente.
- Listas escaneaveis.
- Formularios com labels curtos.
- Status visuais discretos.
- Nada de destaque excessivo em negrito.
- Acoes primarias claras: novo cliente, novo contato, nova oportunidade, concluir tarefa.

## Criterios de aceite

- Usuario autorizado acessa `/modulos/gkit-new`.
- Usuario sem permissao e redirecionado para a plataforma.
- Cliente nao pode ser salvo sem nome e CPF/CNPJ valido.
- Documento duplicado bloqueia cadastro.
- Contato pode ser vinculado a mais de um cliente.
- Cliente pode ter mais de um contato.
- Oportunidade exige cliente e contato vinculado ao cliente.
- Oportunidade aceita data futura.
- Oportunidade aprovada torna cliente ativo.
- Oportunidade pode ser aprovada ou encerrada antes do workflow finalizar.
- Aprovar ou encerrar oportunidade com tarefas pendentes exige motivo obrigatorio.
- Aprovar ou encerrar oportunidade com tarefas pendentes cancela automaticamente as tarefas pendentes.
- Cliente sem oportunidade aprovada fica prospecto.
- Criar oportunidade gera tarefas conforme modelos ativos.
- Tarefas geradas calculam data prevista por dias a partir da criacao da oportunidade.
- Responsavel da tarefa vem da base de usuarios do Core.
- Salvar a mesma oportunidade novamente nao duplica tarefas automaticas.

## Fora de escopo inicial

- Entidade separada de proposta.
- Integracao automatica com Ciclo.
- Importacao de dados do CRM antigo.
- Migracao automatica de empresas/contatos/oportunidades antigas.
- Kanban avancado.
- Automacoes externas de e-mail ou WhatsApp.
- Assinatura digital ou documentos comerciais.

## Sprints sugeridas

### Sprint 1 - Fundacao e base cadastral

Objetivo: colocar o modulo novo de pe com schema proprio, app registrado, permissoes e cadastros essenciais funcionando.

Entregas:

- Criar schema `gkit_new`.
- Criar tabelas `clientes`, `contatos`, `cliente_contatos`, `oportunidades`, `tarefa_modelos`, `tarefas` e `eventos`.
- Criar funcoes de normalizacao de documento, deteccao CPF/CNPJ e recalculo de status do cliente.
- Registrar app `GKIT New` no Core.
- Registrar permissoes `gkit_new.*`.
- Criar rotas e shell do modulo com menu em tres grupos: Cockpit, Base cadastral e Gestao.
- Implementar clientes com CPF/CNPJ obrigatorio e unico.
- Implementar contatos.
- Implementar vinculo N para N entre clientes e contatos.
- Implementar modelos de workflow na Base cadastral.
- Garantir telas compactas sem rolagem vertical no uso normal.

Criterio de pronto:

- Usuario autorizado acessa `/modulos/gkit-new`.
- Cliente, contato e vinculo N:N podem ser criados e editados.
- CPF/CNPJ invalido ou duplicado bloqueia cadastro.
- Menu final ja aparece no formato definitivo.

### Sprint 2 - Oportunidades, workflow e cockpit operacional

Objetivo: tornar o modulo operacional para o usuario comercial.

Entregas:

- Implementar cadastro e edicao de oportunidades.
- Restringir contato da oportunidade aos contatos vinculados ao cliente.
- Permitir data futura na oportunidade.
- Implementar status da oportunidade: `nova`, `proposta_enviada`, `em_negociacao`, `aprovada`, `encerrada`.
- Gerar tarefas automaticas ao criar oportunidade, com base nos modelos ativos.
- Calcular data prevista das tarefas a partir da criacao da oportunidade.
- Atribuir responsavel da tarefa a usuario do Core.
- Recalcular cliente como `ativo` quando houver oportunidade aprovada.
- Recalcular cliente como `prospecto` quando nao houver oportunidade aprovada.
- Exigir motivo para aprovar ou encerrar oportunidade antes do fim do workflow.
- Cancelar automaticamente tarefas pendentes quando houver aprovacao ou encerramento antecipado.
- Implementar Cockpit como acompanhamento de tarefas do operador.
- Adicionar filtros compactos para tarefas e oportunidades.

Criterio de pronto:

- Criar oportunidade gera tarefas sem duplicar em edicoes posteriores.
- Aprovar oportunidade ativa o cliente.
- Encerrar/aprovar antes do fim do workflow exige motivo e cancela pendencias.
- Cockpit permite acompanhar tarefas pendentes, vencidas e do dia sem rolagem vertical em uso normal.

### Sprint 3 - Gestao, acabamento e validacao

Objetivo: fechar o modulo com visao gerencial inicial, consistencia visual e validacao ponta a ponta.

Entregas:

- Criar pagina `Gestao` como base do dashboard futuro.
- Exibir indicadores iniciais: clientes, prospectos, ativos, pipeline, oportunidades por status e produtividade por responsavel.
- Criar views de resumo quando ajudarem a simplificar consultas.
- Adicionar auditoria em eventos relevantes: criacao, edicao, aprovacao, encerramento antecipado e cancelamento automatico de tarefas.
- Revisar UX/UI conforme `docs/design/modulos-operacionais.md`.
- Revisar ortografia e gramatica.
- Validar responsividade e telas sem rolagem global desnecessaria.
- Rodar typecheck, lint e build.
- Executar teste manual do fluxo completo.

Criterio de pronto:

- Fluxo cliente -> contato -> oportunidade -> tarefas -> aprovacao/encerramento funciona de ponta a ponta.
- Gestao abre com indicadores iniciais.
- Build passa sem erro.
- Documentacao fica atualizada com o comportamento implementado.
