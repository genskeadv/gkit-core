# Modulo FIX

## Papel

O FIX, Financial Xperience, e o modulo operacional financeiro da GKIT Suite. Ele nasceu da migracao do antigo Intr e concentra as rotinas de importacao financeira, receitas, despesas, comissoes, pagamentos, orcamento, validacao, inteligencia financeira e fechamento mensal.

Funcionalmente, o FIX deve ser tratado como o produto novo. Tecnicamente, neste momento, ele ainda reaproveita schema, permissoes e parte dos helpers nomeados como Intr.

## Decisao funcional da migracao

- `/modulos/fix/*` e a rota canonica do modulo.
- `/modulos/intr/*` deve ser considerado legado ou compatibilidade.
- A maior parte das rotas antigas de Intr redireciona para FIX.
- O schema operacional atual continua sendo `gkli_intr`.
- As permissoes atuais continuam usando prefixo `intr.*`.
- Os componentes, tipos, queries e actions ainda misturam nomes `Intr` e `Fix`; isso e divida tecnica da migracao, nao uma separacao funcional entre dois produtos.

## Publico

- Administrador global.
- Administrador de carteira ou gestor autorizado.
- Operador financeiro.
- Responsavel por comissoes e pagamentos.
- Usuario de leitura gerencial.

O colaborador final nao opera o FIX diretamente. Ele consome parte dos dados pelo Colab.

## Objetivos funcionais

- Centralizar entradas financeiras vindas de Omie e Banco Inter.
- Calcular e aprovar comissoes a partir das receitas.
- Gerar e controlar pagamentos previstos, pagos e conciliados.
- Classificar despesas por categoria e macrogrupo.
- Detectar recorrencias e formar orcamento de despesas.
- Validar previsto x realizado antes do fechamento.
- Sugerir ajustes operacionais com base nos dados importados.
- Fechar competencias mensais com checklist, pendencias e snapshot.
- Alimentar o Colab com pagamentos, comissoes e demonstrativos individuais.

## Rotas canonicas publicadas

### Cockpit

- `/modulos/fix`

Tela inicial operacional do modulo. Mostra a competencia atual, cards de resumo, pendencias de gestao, importacoes, financeiro, comissoes, pagamentos, previsao e sugestoes.

Acao principal publicada:

- Acessar importacoes.

### Importacoes

- `/modulos/fix/importacoes`

Esteira unificada de entrada de dados. Reune:

- Importacao de receitas Omie.
- Importacao de extratos Inter em CSV.
- Historico de importacoes de receitas.
- Historico de extratos processados.

Regras funcionais:

- Receitas exigem permissao `intr.receitas.write`.
- Extratos exigem permissao `intr.pagamentos.write`.
- A importacao de receitas calcula comissoes quando houver vendedor e tipo de comissao compativel.
- A importacao de extratos alimenta despesas realizadas, classificacao, validacao e inteligencia financeira.

### Financeiro

- `/modulos/fix/financeiro`
- `/modulos/fix/financeiro/extratos`
- `/modulos/fix/financeiro/extratos/[id]`
- `/modulos/fix/financeiro/receitas`
- `/modulos/fix/financeiro/despesas`
- `/modulos/fix/financeiro/orcamento`
- `/modulos/fix/financeiro/validacao`
- `/modulos/fix/financeiro/sugestoes`
- `/modulos/fix/financeiro/inteligencia`

O financeiro e a area de analise e controle das movimentacoes.

`/financeiro` apresenta resumo sintetico, macrogrupos, extratos, contas a pagar/despesas, previsao e sugestoes.

`/extratos` lista arquivos importados. O detalhe `/extratos/[id]` mostra lancamentos normalizados, classificacao, confianca e conciliacao.

`/receitas` lista receitas Omie realizadas, usadas como base de comissoes. Nao deve virar contas a receber completo dentro do FIX.

`/despesas` mostra saidas importadas, despesas nao classificadas e despesas recorrentes detectadas.

`/orcamento` gera previsao futura de despesas a partir de recorrencias reais. O usuario informa competencia base e quantidade de meses.

`/validacao` compara orcamento publicado com despesas realizadas. Permite:

- Gerar validacao por competencia.
- Registrar desvio com justificativa.
- Ignorar validacao.
- Atualizar orcamento futuro com base no desvio.

`/sugestoes` executa o motor de inteligencia financeira. Permite:

- Gerar previsao mensal.
- Gerar sugestoes inteligentes.
- Aceitar sugestoes.
- Rejeitar sugestoes.

`/inteligencia` apresenta resumo por competencia e previsao por macrogrupo/categoria.

Rotas de compatibilidade dentro do proprio FIX:

- `/modulos/fix/financeiro/previsao` redireciona para `/modulos/fix/financeiro/orcamento`.
- `/modulos/fix/financeiro/contas-pagar` redireciona para `/modulos/fix/financeiro/despesas`.
- `/modulos/fix/financeiro/conciliacao` redireciona para `/modulos/fix/financeiro/validacao`.

### Colaboradores e Times

- `/modulos/fix/colaboradores`
- `/modulos/fix/colaboradores/novo`
- `/modulos/fix/colaboradores/[id]`
- `/modulos/fix/times`
- `/modulos/fix/times/novo`
- `/modulos/fix/times/[id]`

Cadastro operacional de pessoas e equipes.

Colaboradores possuem:

- Usuario Core vinculado, quando existir.
- Nome, email, CPF/CNPJ e telefone.
- Status.
- Time.
- Cargo.
- Gestor.
- Salario, pro-labore, ajuda de custo, participacao em honorarios e outros vencimentos.
- Beneficio e observacoes.

Times possuem:

- Nome.
- Descricao.
- Status ativo/inativo.

Permissoes:

- Colaboradores: `intr.colaboradores.write`.
- Times: `intr.times.write`.

### Tipos de comissao

- `/modulos/fix/tipos-comissao`
- `/modulos/fix/tipos-comissao/novo`
- `/modulos/fix/tipos-comissao/[id]`

Cadastro das regras percentuais de comissao.

Campos funcionais:

- Nome.
- Categoria.
- Percentual.
- Indicador de comissao de time, quando suportado pelo banco.
- Ativo/inativo.
- Observacao.

Regra importante:

- A categoria da receita importada deve bater com a categoria ou nome do tipo de comissao para permitir calculo automatico.

Permissao:

- `intr.comissoes.write`.

### Comissoes

- `/modulos/fix/comissoes`
- `/modulos/fix/comissoes/nova`
- `/modulos/fix/comissoes/[id]`
- `/modulos/fix/comissoes/conferir`
- `/modulos/fix/comissoes/aprovacao`

Controla comissoes calculadas ou lancadas manualmente.

`/comissoes` mostra a lista operacional e acoes de workflow.

`/comissoes/conferir` mostra lancamentos detalhados, com filtros por colaborador e tipo.

`/comissoes/aprovacao` e a fila de aprovacao. Permite:

- Aprovar uma comissao.
- Rejeitar uma comissao.
- Devolver comissao para aprovacao/conferencia.
- Aprovar comissoes de uma competencia em lote.
- Gerar pagamentos a partir de comissoes aprovadas.

Estados funcionais esperados:

- Calculada ou pendente de conferencia.
- Aprovada.
- Rejeitada.
- Devolvida para ajuste/conferencia.
- Paga ou vinculada a pagamento, quando aplicavel.

Permissao:

- `intr.comissoes.write`.

### Pagamentos

- `/modulos/fix/pagamentos`
- `/modulos/fix/pagamentos/novo`
- `/modulos/fix/pagamentos/[id]`
- `/modulos/fix/pagamentos/agenda`
- `/modulos/fix/pagamentos/agenda/nova`
- `/modulos/fix/pagamentos/agenda/[id]`
- `/modulos/fix/pagamentos/importacoes`
- `/modulos/fix/pagamentos/conciliar-extrato`

Controla pagamentos internos por colaborador, competencia, tipo e status.

Pagamentos possuem:

- Colaborador.
- Agenda, quando gerado por regra recorrente.
- Fechamento, quando vinculado a competencia.
- Tipo e descricao.
- Competencia.
- Data prevista e data de pagamento.
- Valor bruto, descontos e valor liquido.
- Status.
- Comissao vinculada, quando o pagamento nasceu de comissao.
- Origem e observacao.

Agenda de pagamentos:

- Define regras recorrentes por tipo, colaborador ou grupo.
- Permite gerar pagamentos previstos por competencia.
- Usa dia previsto, valor, descontos, percentual, vigencia e status.

Importacao de recibos:

- Recebe PDFs de recibos de pagamento.
- Faz preview antes de gravar.
- Vincula por nome do colaborador ativo.
- Atualiza recibos ja importados para a mesma competencia.

Conciliacao de extrato:

- Importa OFX para bater saidas bancarias contra pagamentos previstos.
- Exige permissao de pagamentos.

Permissoes:

- Pagamentos: `intr.pagamentos.write`.
- Agenda de pagamentos: `intr.agenda_pagamentos.write`.

### Fechamentos

- `/modulos/fix/fechamentos`
- `/modulos/fix/fechamentos/[id]`

Governanca mensal da competencia.

`/fechamentos` lista competencias abertas, em analise ou fechadas. Tambem permite criar/recalcular competencia.

`/fechamentos/[id]` mostra checklist e acoes:

- Colocar competencia em analise.
- Fechar competencia.
- Reabrir competencia.

O fechamento consolida:

- Receita total.
- Despesa total.
- Orcamento total.
- Comissao total.
- Pagamentos previstos.
- Pagamentos pagos.
- Saldo operacional.
- Pendencias totais.
- Data de fechamento.
- Motivo de reabertura.

Checklist esperado:

- Receitas importadas.
- Despesas classificadas.
- Validacoes tratadas.
- Comissoes aprovadas.
- Pagamentos processados ou sem pendencia.
- Orcamento/previsao disponivel.

Permissao:

- `intr.fechamentos.write`.

### Dashboard e Relatorios

- `/modulos/fix/dashboard`
- `/modulos/fix/relatorios`

`/dashboard` e uma visao gerencial sintetica, diferente do cockpit operacional. Ele prioriza indicadores financeiros, atalhos gerenciais e pendencias que afetam a leitura do periodo.

`/relatorios` e uma central de links para consultas ja publicadas:

- Financeiro sintetico.
- Financeiro detalhado.
- Orcamento de despesas.
- Validacao de despesas.
- Comissoes.
- Pagamentos.
- Times.
- Importacoes.
- Fechamentos.
- Configuracoes.

### Configuracoes

- `/modulos/fix/configuracoes`
- `/modulos/fix/configuracoes/categorias`
- `/modulos/fix/configuracoes/regras`

Central de cadastros tecnicos.

Categorias financeiras:

- Usadas para classificar saidas, previsoes e sugestoes.
- Atualmente publicadas como leitura inicial.
- CRUD fica planejado para etapa posterior.

Regras de classificacao:

- Transformam termos do extrato em macrogrupo, categoria e confianca operacional.
- Atualmente publicadas como leitura inicial.
- Criacao/edicao de regras fica planejada para sprint propria.

## Rotas Intr mantidas por compatibilidade

As rotas abaixo existem, mas redirecionam para FIX:

- `/modulos/intr` -> `/modulos/fix`
- `/modulos/intr/painel` -> `/modulos/fix`
- `/modulos/intr/colaboradores*` -> `/modulos/fix/colaboradores*`
- `/modulos/intr/times*` -> `/modulos/fix/times*`
- `/modulos/intr/comissoes*` -> `/modulos/fix/comissoes*`
- `/modulos/intr/pagamentos*` -> `/modulos/fix/pagamentos*`
- `/modulos/intr/fechamentos*` -> `/modulos/fix/fechamentos*`
- `/modulos/intr/importacoes` -> `/modulos/fix/importacoes`
- `/modulos/intr/receitas*` -> `/modulos/fix/importacoes`
- `/modulos/intr/cadastros/tipos-comissao*` -> `/modulos/fix/tipos-comissao*`
- `/modulos/intr/financeiro*` -> rotas equivalentes ou consolidadas em `/modulos/fix/financeiro*`

Rotas Intr ainda com tela propria:

- `/modulos/intr/documentos`
- `/modulos/intr/reembolsos`
- `/modulos/intr/comunicados`
- `/modulos/intr/integridade`

Essas areas parecem preparadas como listas de apoio ou escopo futuro. Elas nao aparecem como parte central da navegacao atual do FIX.

## Funcionalidades desenvolvidas

Considerar como desenvolvido no codigo atual:

- Shell e navegacao lateral do FIX.
- Cockpit operacional.
- Importacoes unificadas de receitas e extratos.
- Listagem de receitas realizadas.
- Listagem e detalhe de extratos.
- Listagem de despesas, nao classificadas e recorrentes.
- Geracao de orcamento de despesas.
- Validacao de despesas com acoes de tratamento.
- Motor de previsao/sugestoes financeiras.
- Colaboradores e times com CRUD.
- Tipos de comissao com CRUD.
- Comissoes com CRUD, conferencia e aprovacao.
- Pagamentos com CRUD.
- Agenda de pagamentos com CRUD e geracao de previstos.
- Importacao de recibos PDF.
- Conciliacao OFX de pagamentos.
- Fechamentos com checklist e acoes de analise/fechamento/reabertura.
- Dashboard gerencial.
- Central de relatorios.
- Configuracoes de categorias e regras como leitura.
- Redirecionamentos das rotas antigas de Intr.

## Funcionalidades planejadas ou incompletas

- Renomear contrato tecnico de `Intr` para `Fix` sem quebrar Colab e dados existentes.
- Criar permissoes `fix.*` ou decidir formalmente manter `intr.*`.
- Migrar ou aliasar o cadastro de app em `core.apps` de `intr` para `fix`.
- Remover duplicidade entre `features/intr`, `features/fix` e `features/fix/_legacy`.
- Completar CRUD de categorias financeiras.
- Completar CRUD de regras de classificacao.
- Definir destino funcional de documentos internos, reembolsos, comunicados e integridade.
- Criar auditoria operacional por acao critica.
- Criar testes minimos para importacao, comissoes, pagamentos e fechamento.
- Validar o fluxo completo em base real: receita -> comissao -> aprovacao -> pagamento -> conciliacao -> fechamento.
- Revisar textos com encoding quebrado antes de validar visualmente.

## Dependencias de dados

Schema principal:

- `gkli_intr`

Tabelas e objetos usados diretamente ou por views:

- `colaboradores`
- `times`
- `comissao_tipos`
- `receitas`
- `receita_importacoes`
- `comissoes`
- `pagamentos`
- `pagamento_agendas`
- `fechamentos`
- `extrato_importacoes`
- `extrato_lancamentos`
- `financeiro_categorias`
- `financeiro_regras_classificacao`
- `financeiro_sugestoes`
- `contas_pagar_operacionais`

Views/resumos usados pelo app:

- `gkli_intr_pagamentos_resumo`
- `gkli_intr_comissoes_resumo`
- `gkli_intr_fix_extrato_lancamentos_resumo`
- `gkli_intr_fix_despesas_realizadas_resumo`
- `gkli_intr_fix_despesas_recorrentes_resumo`
- `gkli_intr_fix_orcamento_despesas_resumo`
- `gkli_intr_fix_validacao_despesas_resumo`
- `gkit_fix_comissoes_aprovacao_resumo`
- `gkit_fix_fechamento_checklist_resumo`

Observacao: a pasta `sql/` deste checkout esta vazia, embora a documentacao antiga cite migrations `07` a `12`. Isso precisa ser resolvido antes de qualquer validacao de ambiente novo.

## Permissoes

Permissoes funcionais hoje usadas pelo FIX:

- `intr.colaboradores.write`
- `intr.times.write`
- `intr.receitas.write`
- `intr.comissoes.write`
- `intr.pagamentos.write`
- `intr.agenda_pagamentos.write`
- `intr.fechamentos.write`

Leitura e entrada no modulo continuam passando por `requireModuleAccess('intr')`, mesmo nas rotas `/modulos/fix`. Isso significa que, no Core, o acesso ao FIX depende do app/permissao historicamente cadastrado como Intr.

## Relacao com Colab

O Colab depende dos dados operacionais do FIX/Intr para mostrar ao colaborador:

- Perfil.
- Pagamentos.
- Comissoes.
- Beneficios leves.
- Documentos demonstrativos.

Por isso, qualquer renomeacao de schema, views ou permissoes precisa preservar compatibilidade com o Colab ou migrar os dois em conjunto.

## Riscos atuais

- O modulo nao esta tecnicamente coeso: nomes `Intr` e `Fix` coexistem em rotas, componentes, actions, queries e permissoes.
- O typecheck atual quebra em wrappers de `features/fix/colaboradores/actions.ts`, `features/fix/gestao/actions.ts` e em `features/fix/queries.ts`.
- Algumas rotas de compatibilidade apontam para rotas que tambem redirecionam, como `previsao`, `contas-pagar` e `conciliacao`.
- A pasta `sql/` nao contem as migrations citadas pela documentacao.
- O modulo usa service role server-side; falha de checagem de permissao antes de escrita e risco critico.
- Parte dos textos visiveis tem encoding quebrado.

## Recomendacao de consolidacao

1. Declarar `FIX` como nome funcional unico.
2. Manter `/modulos/intr/*` apenas como redirects temporarios.
3. Criar ou restaurar documentacao/migrations reais do banco.
4. Corrigir typecheck dos wrappers FIX.
5. Decidir entre duas estrategias tecnicas:
   - manter schema/permissoes `gkli_intr`/`intr.*` como legado estavel, com fachada FIX limpa;
   - migrar tudo para `fix.*` em banco, Core, permissoes, codigo e Colab.
6. Se a escolha for fachada limpa, renomear apenas exports, componentes e rotas publicas para FIX, deixando `gkli_intr` isolado na camada de dados.
7. Se a escolha for migracao completa, fazer em lote controlado com scripts SQL, aliases temporarios e validacao do Colab.
