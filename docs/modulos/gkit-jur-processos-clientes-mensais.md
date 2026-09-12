# GKIT Jur - Processos de clientes mensais conduzidos por outros escritorios

## Papel

Esta especificacao define como o GKIT Jur deve acompanhar processos judiciais de clientes mensais em que o Genske Advogados nao e o escritorio responsavel pela conducao direta do caso.

A proposta nao e criar um novo modulo, nem duplicar a base processual. O correto e ampliar `gkit_jur.processos` para distinguir o papel operacional do Genske em cada processo, aproveitando a estrutura ja existente de cliente, carteira, responsavel, DataJud, movimentacoes, publicacoes, tarefas, etiquetas e relatorios.

## Objetivo

Permitir que o escritorio acompanhe, para fins consultivos e de gestao de risco, processos relevantes de clientes mensais conduzidos por terceiros.

O modulo deve responder perguntas como:

- Quais clientes mensais possuem processos ativos conduzidos por outros escritorios?
- Houve movimentacao relevante desde a ultima revisao?
- Qual escritorio externo esta conduzindo o caso?
- O cliente autorizou o acompanhamento?
- Ha algum risco, prazo, publicacao ou decisao que exige ciencia interna?
- O processo deve aparecer no relatorio mensal do cliente?

## Decisao de arquitetura

Usar a tabela existente `gkit_jur.processos` como base unica de processos acompanhados.

Motivos:

- `gkit_jur.processos` ja representa acompanhamento processual, nao apenas atuacao direta.
- A tabela ja integra com `ciclo.clientes`, `core.carteiras` e `security.usuarios`.
- O robo DataJud/AASP ja trabalha em cima de `status`, `status_monitoramento`, `tribunal_alias` e `numero_cnj_limpo`.
- Movimentacoes, publicacoes, tarefas, acordos e resumo operacional ja apontam para `processo_id`.
- Criar tabela separada exigiria duplicar filtros, cockpit, detalhe, timeline, inbox, permissao e relatorios.

## Escopo do MVP

- Marcar o tipo de acompanhamento do processo.
- Informar escritorio externo responsavel.
- Indicar se o processo pertence a cliente mensal.
- Registrar autorizacao/justificativa para monitoramento.
- Filtrar a lista de processos por acompanhamento externo.
- Exibir o marcador no cockpit, lista e detalhe.
- Permitir importacao por planilha com esses campos.
- Incluir os processos no monitoramento DataJud quando autorizados e configurados.
- Gerar metricas iniciais por cliente mensal, escritorio externo e status de monitoramento.

## Fora do escopo inicial

- Integracao automatica com sistemas internos de escritorios terceiros.
- Captura de pecas processuais sigilosas.
- Peticionamento ou protocolo.
- Controle contratual do escritorio externo.
- Comunicacao automatica com o escritorio externo.
- Analise juridica conclusiva sem revisao humana.
- Monitoramento de processos sigilosos sem regra especifica de permissao e autorizacao.

## Modelo operacional

### Tipos de acompanhamento

Campo recomendado: `tipo_acompanhamento`.

Valores:

- `atuacao_genske`: processo conduzido diretamente pelo Genske Advogados.
- `cliente_mensal_outro_escritorio`: processo de cliente mensal conduzido por outro escritorio.
- `apoio_consultivo`: processo acompanhado para apoio estrategico, sem conducao direta.
- `somente_ciencia`: processo acompanhado apenas para ciencia e relatorio.

Valor padrao para registros existentes: `atuacao_genske`.

### Campos complementares

Campos recomendados em `gkit_jur.processos`:

```sql
tipo_acompanhamento text not null default 'atuacao_genske';
escritorio_responsavel_nome text;
escritorio_responsavel_contato text;
acompanhamento_autorizado_em timestamptz;
acompanhamento_autorizado_por uuid references security.usuarios(id) on delete set null;
acompanhamento_observacoes text;
incluir_relatorio_mensal boolean not null default true;
```

Observacoes:

- `cliente_mensal` nao precisa ser duplicado em `gkit_jur.processos`, pois ja existe em `ciclo.clientes.tipo_cliente`.
- Para processos sem `cliente_id`, usar `cliente_nome` como snapshot temporario, mas a fila de saneamento deve incentivar o vinculo com `ciclo.clientes`.
- `escritorio_responsavel_nome` deve ser texto livre no MVP. Um cadastro normalizado de escritorios externos pode vir depois, se houver volume ou necessidade de relacionamento historico.

### Constraint recomendada

Usar `text` com `check`, acompanhando o padrao atual do projeto.

```sql
check (
  tipo_acompanhamento in (
    'atuacao_genske',
    'cliente_mensal_outro_escritorio',
    'apoio_consultivo',
    'somente_ciencia'
  )
)
```

Como Postgres nao aceita `add constraint if not exists`, a migration deve criar a constraint com bloco `do $$ ... if not exists ... $$`.

## Regra para cliente mensal

Um processo deve ser considerado "cliente mensal / outro escritorio" quando:

- `gkit_jur.processos.tipo_acompanhamento = 'cliente_mensal_outro_escritorio'`;
- `gkit_jur.processos.cliente_id` aponta para `ciclo.clientes.id`;
- `ciclo.clientes.tipo_cliente = 'mensal'`;
- `gkit_jur.processos.status != 'arquivado'`, salvo filtro explicito;
- `gkit_jur.processos.incluir_relatorio_mensal = true`, para aparecer em relatorios mensais.

Se o cliente ainda nao estiver vinculado:

- o processo pode ser salvo com `cliente_nome`;
- deve aparecer em saneamento como "cliente pendente";
- nao deve entrar nas metricas definitivas de cliente mensal ate o vinculo com `ciclo.clientes`.

## Monitoramento

O monitoramento deve continuar usando a infraestrutura existente:

- `status = 'ativo'`;
- `status_monitoramento = 'monitorando'`;
- `tribunal_alias` preenchido;
- `numero_cnj_limpo` valido.

Regras adicionais:

- Para `cliente_mensal_outro_escritorio`, exigir `acompanhamento_autorizado_em` antes de monitoramento automatico.
- Se nao houver autorizacao, gravar `status_monitoramento = 'nao_monitorar'`.
- Processos em `somente_ciencia` podem ser monitorados, mas nao devem gerar tarefa automatica sem regra explicita.
- Movimentacoes relevantes devem gerar item de inbox como "ciencia/revisao", nao como providencia processual direta.

## Publicacoes e intimacoes

Publicacoes vinculadas a processo de outro escritorio devem entrar na caixa de publicacoes, mas com tratamento diferente.

Regras:

- Mostrar marcador "Outro escritorio".
- Sugerir a decisao `registrar_ciencia` como padrao.
- Permitir `gerar_tarefa` apenas para acompanhamento interno, contato com cliente ou registro no relatorio.
- Evitar linguagem de peticionamento ou prazo processual como obrigacao direta do Genske, salvo alteracao manual.

## Inbox e tarefas

Tarefas geradas nesses processos devem ser consultivas/operacionais.

Tipos esperados:

- revisar movimentacao relevante;
- registrar ciencia ao cliente;
- solicitar atualizacao ao escritorio externo;
- incluir observacao no relatorio mensal;
- validar risco com responsavel interno.

Campos herdados:

- `carteira_id`: carteira operacional do cliente;
- `responsavel_id`: responsavel interno pelo acompanhamento;
- `cliente_id`: cliente mensal vinculado.

## UI proposta

### Navegacao

Nao criar nova area principal no MVP. A entrada deve ficar em:

- `/modulos/gkit-jur/processos`
- `/modulos/gkit-jur/processos/lista`
- `/modulos/gkit-jur/processos/[id]`
- `/modulos/gkit-jur/relatorios`

Evolucao possivel: card/atalho "Clientes mensais" no `Novo Jur`.

### Lista de processos

Adicionar filtro:

- Tipo de acompanhamento

Opcoes:

- Todos
- Atuacao Genske
- Cliente mensal / outro escritorio
- Apoio consultivo
- Somente ciencia

Adicionar busca por:

- escritorio responsavel;
- observacoes de acompanhamento.

Adicionar chip/coluna visual:

- `Atuacao Genske`
- `Outro escritorio`
- `Apoio consultivo`
- `Somente ciencia`

### Cockpit de processos

Adicionar metricas:

- Clientes mensais / outro escritorio.
- Sem autorizacao de monitoramento.
- Sem escritorio responsavel.
- Movimentacoes relevantes em processos externos nos ultimos 30 dias.

Chamadas operacionais:

- "Validar autorizacoes"
- "Definir escritorio externo"
- "Revisar movimentacoes externas"

### Detalhe do processo

Em "Ajustes operacionais", adicionar:

- Tipo de acompanhamento.
- Escritorio responsavel.
- Contato do escritorio responsavel.
- Autorizacao de acompanhamento.
- Incluir no relatorio mensal.
- Observacoes do acompanhamento.

No cabecalho/dash do processo:

- Exibir marcador "Cliente mensal / outro escritorio" quando aplicavel.
- Exibir escritorio responsavel abaixo do cliente/carteira.
- Ajustar copy dos alertas para ciencia/acompanhamento, nao conducao.

## Importacao por planilha

Atualizar `scripts/import-gkit-jur-processos.mjs` para aceitar colunas:

- `Tipo de acompanhamento`
- `Papel do Genske`
- `Escritorio responsavel`
- `Contato do escritorio`
- `Autorizado monitorar em`
- `Incluir no relatorio mensal`
- `Observacoes de acompanhamento`

Normalizacao sugerida:

- "Genske", "atuacao", "interno" -> `atuacao_genske`
- "outro escritorio", "externo", "terceiro" -> `cliente_mensal_outro_escritorio`
- "consultivo", "apoio" -> `apoio_consultivo`
- "ciencia", "somente ciencia", "relatorio" -> `somente_ciencia`

Validacoes:

- Se `tipo_acompanhamento = 'cliente_mensal_outro_escritorio'`, recomendar `escritorio_responsavel_nome`.
- Se `status_monitoramento = 'monitorando'`, recomendar autorizacao preenchida.
- Se `cliente_id` nao foi encontrado, manter `cliente_nome` e registrar no relatorio de importacao como saneamento pendente.

## Queries e tipos TypeScript

### Tipos

Adicionar:

```ts
export type GkitJurTipoAcompanhamento =
  | 'atuacao_genske'
  | 'cliente_mensal_outro_escritorio'
  | 'apoio_consultivo'
  | 'somente_ciencia'
```

Adicionar a `GkitJurProcessListItem` e `GkitJurProcessDetail`:

```ts
tipoAcompanhamento: GkitJurTipoAcompanhamento
escritorioResponsavelNome: string | null
escritorioResponsavelContato: string | null
acompanhamentoAutorizadoEm: string | null
acompanhamentoObservacoes: string | null
incluirRelatorioMensal: boolean
```

Adicionar a `GkitJurProcessFilters`:

```ts
tipoAcompanhamento: string
clienteMensal: string
```

### Select base

Atualizar `PROCESS_LIST_SELECT` com:

```text
tipo_acompanhamento,
escritorio_responsavel_nome,
escritorio_responsavel_contato,
acompanhamento_autorizado_em,
acompanhamento_observacoes,
incluir_relatorio_mensal
```

### Filtros

Adicionar em `applyProcessFilters`:

- filtro por `tipo_acompanhamento`;
- filtro `cliente_mensal=1`, preferencialmente resolvendo IDs em `ciclo.clientes` e aplicando `.in('cliente_id', ids)` por lotes se necessario;
- saneamento `sem_escritorio_externo`;
- saneamento `sem_autorizacao_monitoramento`.

## Relatorios

Relatorio mensal por cliente deve incluir secao:

### Processos acompanhados de outros escritorios

Campos minimos:

- numero CNJ;
- tribunal;
- classe/natureza;
- escritorio responsavel;
- ultima movimentacao;
- resumo operacional;
- riscos/alertas;
- acao sugerida para o cliente;
- status de monitoramento.

Regras:

- Incluir apenas processos com `incluir_relatorio_mensal = true`.
- Separar claramente de processos conduzidos pelo Genske.
- Nao sugerir providencia processual direta quando o Genske nao for o patrono, salvo anotacao manual.

## Permissoes

No MVP, reutilizar:

- `gkit_jur.processos.read`
- `gkit_jur.processos.write`
- `gkit_jur.processos.sync`

Permissao futura opcional:

- `gkit_jur.processos_externos.read`
- `gkit_jur.processos_externos.write`

Nao criar permissao nova no MVP, a menos que haja necessidade de separar quem ve processos conduzidos pelo Genske de quem ve processos acompanhados de terceiros.

## RLS e seguranca

Manter RLS nas tabelas do schema `gkit_jur`.

Regras:

- A politica atual baseada em permissao e carteira continua adequada para o MVP.
- Processos externos devem respeitar `carteira_id`, igual aos demais processos.
- Processos sem `carteira_id` ficam visiveis para quem tem permissao geral, conforme regra atual, mas devem aparecer em saneamento.
- Nao usar `user_metadata` para autorizacao.
- Chaves de integracao continuam somente server-side.
- Dados sigilosos ou documentos nao-publicos de terceiros nao devem ser importados sem autorizacao expressa.

## Indices recomendados

Adicionar indices para os filtros novos:

```sql
create index if not exists idx_gkit_jur_processos_tipo_acompanhamento
  on gkit_jur.processos(tipo_acompanhamento, status);

create index if not exists idx_gkit_jur_processos_externos_monitoramento
  on gkit_jur.processos(status, status_monitoramento, acompanhamento_autorizado_em)
  where tipo_acompanhamento = 'cliente_mensal_outro_escritorio';

create index if not exists idx_gkit_jur_processos_escritorio_responsavel
  on gkit_jur.processos using gin (to_tsvector('simple', coalesce(escritorio_responsavel_nome, '')));
```

## Auditoria

Registrar eventos operacionais quando:

- tipo de acompanhamento for alterado;
- escritorio responsavel for informado ou alterado;
- monitoramento for autorizado;
- processo externo for incluido ou removido de relatorio mensal;
- tarefa consultiva for criada a partir de movimentacao externa.

Acoes sugeridas:

- `processo_tipo_acompanhamento_atualizado`
- `processo_escritorio_externo_atualizado`
- `processo_monitoramento_externo_autorizado`
- `processo_relatorio_mensal_atualizado`

## Criterios de aceite

- Processo existente continua funcionando com `tipo_acompanhamento = 'atuacao_genske'`.
- Usuario consegue marcar processo como `cliente_mensal_outro_escritorio`.
- Usuario consegue informar escritorio responsavel e contato.
- Lista permite filtrar processos de clientes mensais conduzidos por terceiros.
- Detalhe exibe claramente que o Genske nao conduz o processo.
- Sincronizacao automatica respeita autorizacao de monitoramento.
- Publicacoes e movimentacoes externas entram como ciencia/revisao, nao como providencia processual direta.
- Importador aceita os novos campos e registra pendencias no relatorio.
- Relatorio mensal separa processos do Genske de processos de terceiros.
- Build continua passando.

## Plano de implementacao

### Sprint 1 - Dados e tipos

- Criar migration com novos campos em `gkit_jur.processos`.
- Adicionar constraint de `tipo_acompanhamento`.
- Criar indices.
- Atualizar `GkitJurProcessListItem`, `GkitJurProcessDetail` e filtros.
- Atualizar `PROCESS_LIST_SELECT` e `mapProcesso`.

### Sprint 2 - Lista e detalhe

- Adicionar filtro de tipo de acompanhamento.
- Adicionar saneamentos de escritorio/autorizacao.
- Exibir chip "Outro escritorio" na lista.
- Adicionar campos no formulario de detalhe.
- Ajustar textos operacionais no detalhe quando o tipo nao for `atuacao_genske`.

### Sprint 3 - Importador e cockpit

- Atualizar importador de planilha.
- Adicionar contadores no cockpit de processos.
- Adicionar chamadas operacionais para autorizacao e escritorio externo.
- Atualizar sugestoes de saneamento.

### Sprint 4 - Inbox, publicacoes e relatorios

- Ajustar criacao de tarefas para processos externos.
- Adicionar secao no relatorio mensal.
- Revisar tratamento de publicacoes.
- Incluir auditoria dos campos novos.

## Riscos e cuidados

- Confundir acompanhamento consultivo com responsabilidade processual direta.
- Gerar tarefa de prazo para processo conduzido por terceiro sem revisao humana.
- Monitorar processo sem autorizacao do cliente.
- Misturar dados de processos sigilosos em relatorio mensal.
- Duplicar o conceito de cliente mensal fora do Ciclo.

Mitigacao:

- Separar visualmente o tipo de acompanhamento.
- Exigir autorizacao para monitoramento automatico externo.
- Usar `ciclo.clientes.tipo_cliente` como fonte da verdade.
- Preferir tarefas de ciencia/revisao para processos externos.
- Manter RLS por carteira e permissao.

