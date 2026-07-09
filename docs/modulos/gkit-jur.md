# GKIT Jur - Especificacao funcional e tecnica adaptada

## Papel

O GKIT Jur e o modulo juridico da GKIT Suite. Ele deve acompanhar processos judiciais por numero CNJ, consultar dados publicos no DataJud/CNJ, armazenar capa processual, movimentacoes, historico de sincronizacoes e preparar a base para prazos, alertas, relatorios e inteligencia juridica.

Para publicacoes e intimacoes, a direcao aprovada e tratar esses itens como caixa de entrada operacional, nao como arquivo permanente de conteudo bruto. A especificacao detalhada esta em `docs/modulos/gkit-jur-caixa-publicacoes.md`.

O modulo nao deve recriar cadastros transversais. Sempre que possivel, deve referenciar clientes, carteiras, usuarios, administradoras e entidades ja existentes no Core, Ciclo e demais modulos.

## Decisoes adaptadas para o gkit-core

- Produto: `GKIT Jur`.
- Codigo interno do app: `gkit_jur`.
- Rota canonica: `/modulos/gkit-jur`.
- Pasta de UI e regras: `features/gkit-jur`.
- Schema de banco recomendado: `gkit_jur`.
- Menu inicial: Cockpit, Processos, Prazos, Agenda, Documentos, Relatorios e Cadastros.
- Entrada operacional: cockpit em `/modulos/gkit-jur`.
- Integracao inicial: API Publica DataJud/CNJ.
- Direcao de publicacoes: caixa de entrada com IA sugerindo providencias e humano confirmando tratamento.
- Permissoes devem seguir o padrao `gkit_jur.recurso.acao`.

## O que ja existe

- Casca do modulo em `/modulos/gkit-jur`.
- Menu lateral com as areas iniciais.
- Cockpit com cards de acao e metricas zeradas.
- Paginas placeholder para Processos, Prazos, Agenda, Documentos, Relatorios e Cadastros.
- Cadastro do app em `core.apps` com codigo `gkit_jur`.
- Permissoes iniciais:
  - `gkit_jur.dashboard.read`
  - `gkit_jur.operacao.write`

## Escopo do MVP

- Tela de processos acompanhados.
- Cadastro manual de processo por numero CNJ.
- Selecao manual do tribunal/alias DataJud.
- Consulta server-side ao DataJud por numero CNJ.
- Salvamento da capa processual e metadados brutos.
- Salvamento de movimentacoes com deduplicacao.
- Historico de sincronizacoes com sucesso, erro, timeout ou sem resultado.
- Filtros por cliente, carteira, responsavel, tribunal, status e datas.
- Pagina de detalhe do processo com capa, vinculos, timeline e historico.
- Botao `Sincronizar agora`.
- Status de monitoramento preparado para jobs futuros.
- Estados vazios, erros amigaveis e validacao de build.

## Fora do escopo do MVP

- Job automatico real de monitoramento, se a infraestrutura de cron ainda nao estiver definida.
- Integracao direta com PJe, e-SAJ, Projudi ou APIs privadas.
- Captura completa de publicacoes e intimacoes em diario oficial como arquivo permanente.
- Peticionamento, download automatico de pecas ou OCR.
- Classificacao avancada por IA.
- Integracao WhatsApp.
- Relatorios financeiros ou cobranca.

## Evolucao aprovada: caixa de publicacoes

Publicacoes e intimacoes devem evoluir para uma caixa de entrada propria. A meta nao e guardar todo o conteudo para sempre, pois o processo digital e as fontes oficiais seguem como origem formal. A meta e garantir tratamento:

- capturar o item com metadados minimos, preview e hash;
- sugerir classificacao e providencia por IA;
- exigir confirmacao humana para tratar, dispensar ou vincular;
- registrar decisao, usuario, data, tarefa/prazo/documento vinculado e motivo;
- retirar itens tratados da fila principal;
- aplicar retencao ao conteudo pesado depois de prazo configuravel, mantendo a trilha minima.

Documento-base: `docs/modulos/gkit-jur-caixa-publicacoes.md`.

## Modelo de navegacao

### Cockpit

Rota: `/modulos/gkit-jur`

Objetivo: entrada operacional do modulo, com atalhos para as principais tarefas juridicas e uma fila resumida dos processos/prioridades.

Cards de acao iniciais:

- Processos: abrir cadastro/lista de processos.
- Prazos: visualizar vencimentos e prioridades.
- Agenda: acompanhar audiencias, reunioes e compromissos.
- Documentos: organizar pecas, anexos e comprovantes.

### Processos

Rota: `/modulos/gkit-jur/processos`

Objetivo: lista principal de processos acompanhados, filtros, cadastro por CNJ e acoes de sincronizacao.

### Prazos

Rota: `/modulos/gkit-jur/prazos`

Objetivo: base futura para vencimentos, responsaveis e SLA. No MVP, pode ser alimentada por movimentacoes relevantes e por cadastro manual.

### Agenda

Rota: `/modulos/gkit-jur/agenda`

Objetivo: compromissos juridicos, audiencias e tarefas de acompanhamento.

### Documentos

Rota: `/modulos/gkit-jur/documentos`

Objetivo: controle de documentos juridicos vinculados a processos e clientes.

### Relatorios

Rota: `/modulos/gkit-jur/relatorios`

Objetivo: indicadores por cliente, carteira, tribunal, responsavel e status.

### Cadastros

Rota: `/modulos/gkit-jur/cadastros`

Objetivo: cadastros auxiliares como tipos, fases, etiquetas, tribunais favoritos e regras de relevancia.

## Integracao DataJud/CNJ

### Variaveis de ambiente

```env
DATAJUD_API_KEY=
DATAJUD_BASE_URL=https://api-publica.datajud.cnj.jus.br
```

Regras:

- A chave deve existir apenas no server-side.
- Nunca expor `DATAJUD_API_KEY` em client component, HTML, logs publicos ou resposta de API.
- Se a chave estiver ausente, invalida ou expirada, a UI deve exibir erro amigavel.

### Autenticacao

```http
Authorization: APIKey ${DATAJUD_API_KEY}
Content-Type: application/json
```

### Endpoint

```text
${DATAJUD_BASE_URL}/${tribunalAlias}/_search
```

Exemplo:

```text
https://api-publica.datajud.cnj.jus.br/api_publica_tjsp/_search
```

### Consulta por CNJ

```json
{
  "query": {
    "match": {
      "numeroProcesso": "00000000000000000000"
    }
  }
}
```

### Tribunais iniciais

```ts
export const DATAJUD_TRIBUNAIS = [
  { sigla: 'TJSP', nome: 'Tribunal de Justica de Sao Paulo', alias: 'api_publica_tjsp' },
  { sigla: 'TJRJ', nome: 'Tribunal de Justica do Rio de Janeiro', alias: 'api_publica_tjrj' },
  { sigla: 'TJMG', nome: 'Tribunal de Justica de Minas Gerais', alias: 'api_publica_tjmg' },
  { sigla: 'TJPR', nome: 'Tribunal de Justica do Parana', alias: 'api_publica_tjpr' },
  { sigla: 'TJRS', nome: 'Tribunal de Justica do Rio Grande do Sul', alias: 'api_publica_tjrs' },
  { sigla: 'TRF3', nome: 'Tribunal Regional Federal da 3a Regiao', alias: 'api_publica_trf3' },
  { sigla: 'TRT2', nome: 'Tribunal Regional do Trabalho da 2a Regiao', alias: 'api_publica_trt2' },
  { sigla: 'STJ', nome: 'Superior Tribunal de Justica', alias: 'api_publica_stj' },
]
```

No MVP, o usuario escolhe o tribunal. Busca multi-tribunal fica para evolucao futura.

## Modelo de dados recomendado

### Schema

```sql
create schema if not exists gkit_jur;
```

### `gkit_jur.processos`

```sql
create table if not exists gkit_jur.processos (
  id uuid primary key default gen_random_uuid(),
  numero_cnj text not null,
  numero_cnj_limpo text not null,
  tribunal_sigla text,
  tribunal_alias text,
  grau text,
  classe_codigo bigint,
  classe_nome text,
  sistema_codigo bigint,
  sistema_nome text,
  formato_codigo bigint,
  formato_nome text,
  nivel_sigilo bigint,
  orgao_julgador_codigo bigint,
  orgao_julgador_nome text,
  orgao_julgador_codigo_municipio_ibge bigint,
  data_ajuizamento timestamptz,
  data_hora_ultima_atualizacao_datajud timestamptz,
  cliente_id uuid,
  carteira_id uuid,
  responsavel_id uuid,
  administradora_id uuid,
  origem_modulo text,
  origem_id uuid,
  status text not null default 'ativo',
  status_monitoramento text not null default 'monitorando',
  ultima_sincronizacao_em timestamptz,
  ultima_movimentacao_em timestamptz,
  datajud_id text,
  datajud_index text,
  datajud_score numeric,
  assuntos jsonb not null default '[]'::jsonb,
  metadata_datajud jsonb not null default '{}'::jsonb,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gkit_jur_processos_numero_cnj_limpo_unique unique (numero_cnj_limpo)
);
```

Status de processo:

- `ativo`
- `arquivado`
- `suspenso`
- `encerrado`
- `erro`

Status de monitoramento:

- `monitorando`
- `pausado`
- `erro`
- `nao_monitorar`

### `gkit_jur.movimentacoes`

```sql
create table if not exists gkit_jur.movimentacoes (
  id uuid primary key default gen_random_uuid(),
  processo_id uuid not null references gkit_jur.processos(id) on delete cascade,
  codigo bigint,
  nome text not null,
  data_hora timestamptz,
  orgao_codigo bigint,
  orgao_nome text,
  complementos_tabelados jsonb not null default '[]'::jsonb,
  raw_movimento jsonb not null default '{}'::jsonb,
  hash_movimento text not null,
  origem text not null default 'datajud',
  relevante boolean not null default false,
  gera_alerta boolean not null default false,
  alerta_gerado boolean not null default false,
  created_at timestamptz not null default now(),
  constraint gkit_jur_movimentacoes_hash_unique unique (processo_id, hash_movimento)
);
```

### `gkit_jur.sincronizacoes`

```sql
create table if not exists gkit_jur.sincronizacoes (
  id uuid primary key default gen_random_uuid(),
  processo_id uuid references gkit_jur.processos(id) on delete set null,
  numero_cnj_limpo text not null,
  tribunal_alias text not null,
  provedor text not null default 'datajud',
  status text not null,
  http_status integer,
  total_resultados integer,
  total_movimentacoes_recebidas integer default 0,
  total_movimentacoes_novas integer default 0,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  erro_codigo text,
  erro_mensagem text,
  request_payload jsonb not null default '{}'::jsonb,
  response_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
```

Status de sincronizacao:

- `sucesso`
- `erro`
- `sem_resultado`
- `parcial`
- `timeout`

### `gkit_jur.monitoramentos`

```sql
create table if not exists gkit_jur.monitoramentos (
  id uuid primary key default gen_random_uuid(),
  processo_id uuid not null references gkit_jur.processos(id) on delete cascade,
  ativo boolean not null default true,
  frequencia text not null default 'diaria',
  ultima_execucao_em timestamptz,
  proxima_execucao_em timestamptz,
  falhas_consecutivas integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gkit_jur_monitoramentos_processo_unique unique (processo_id)
);
```

Frequencias previstas:

- `manual`
- `diaria`
- `semanal`
- `mensal`

### Indices

```sql
create index if not exists idx_gkit_jur_processos_cliente_id
  on gkit_jur.processos(cliente_id);

create index if not exists idx_gkit_jur_processos_carteira_id
  on gkit_jur.processos(carteira_id);

create index if not exists idx_gkit_jur_processos_responsavel_id
  on gkit_jur.processos(responsavel_id);

create index if not exists idx_gkit_jur_processos_status
  on gkit_jur.processos(status);

create index if not exists idx_gkit_jur_processos_monitoramento
  on gkit_jur.processos(status_monitoramento);

create index if not exists idx_gkit_jur_processos_ultima_movimentacao
  on gkit_jur.processos(ultima_movimentacao_em desc);

create index if not exists idx_gkit_jur_movimentacoes_processo_data
  on gkit_jur.movimentacoes(processo_id, data_hora desc);

create index if not exists idx_gkit_jur_sincronizacoes_processo
  on gkit_jur.sincronizacoes(processo_id, started_at desc);
```

## Estrutura tecnica sugerida

```text
features/gkit-jur/
  actions.ts
  components.tsx
  datajud-client.ts
  datajud-tribunais.ts
  normalizer.ts
  persistence.ts
  queries.ts
  sync-service.ts
  types.ts
```

Rotas:

```text
app/modulos/gkit-jur/page.tsx
app/modulos/gkit-jur/processos/page.tsx
app/modulos/gkit-jur/processos/[id]/page.tsx
app/modulos/gkit-jur/prazos/page.tsx
app/modulos/gkit-jur/agenda/page.tsx
app/modulos/gkit-jur/documentos/page.tsx
app/modulos/gkit-jur/relatorios/page.tsx
app/modulos/gkit-jur/cadastros/page.tsx
```

## Tipos base

```ts
export type GkitJurProcessoStatus =
  | 'ativo'
  | 'arquivado'
  | 'suspenso'
  | 'encerrado'
  | 'erro'

export type GkitJurMonitoramentoStatus =
  | 'monitorando'
  | 'pausado'
  | 'erro'
  | 'nao_monitorar'

export type GkitJurSyncStatus =
  | 'sucesso'
  | 'erro'
  | 'sem_resultado'
  | 'parcial'
  | 'timeout'
```

## Normalizacao CNJ

```ts
export function normalizeCnj(value: string): string {
  return value.replace(/\D/g, '')
}

export function isValidCnj(value: string): boolean {
  return normalizeCnj(value).length === 20
}
```

No MVP, validacao por tamanho e suficiente. A validacao completa do digito verificador pode entrar depois.

## Fluxo de sincronizacao

Funcao principal:

```ts
export async function sincronizarProcessoPorCnj(params: {
  numeroCnj: string
  tribunalAlias: string
  clienteId?: string
  carteiraId?: string
  responsavelId?: string
  origemModulo?: string
  origemId?: string
}): Promise<GkitJurSyncResult>
```

Fluxo esperado:

- Criar registro inicial em `gkit_jur.sincronizacoes`.
- Consultar DataJud pelo numero CNJ e alias selecionado.
- Se nao houver resultado, gravar `sem_resultado` e retornar mensagem amigavel.
- Se houver resultado, extrair o primeiro item de `hits.hits`.
- Fazer upsert em `gkit_jur.processos`.
- Processar movimentacoes recebidas.
- Gerar hash deterministico por movimentacao.
- Inserir apenas movimentacoes novas.
- Atualizar `ultima_movimentacao_em` e `ultima_sincronizacao_em`.
- Criar ou atualizar `gkit_jur.monitoramentos`.
- Gravar sincronizacao como `sucesso`, `parcial` ou `erro`.

## Deduplicacao de movimentacoes

Movimentacoes nao podem ser duplicadas a cada nova sincronizacao.

Base sugerida para hash:

```ts
const base = {
  codigo: movimento.codigo ?? null,
  nome: movimento.nome ?? '',
  dataHora: movimento.dataHora ?? null,
  orgaoNome: movimento.orgaoJulgador?.nomeOrgao ?? null,
  complementos: movimento.complementosTabelados ?? [],
}
```

O hash deve ser `sha256(stableStringify(base))`.

## Regras de atualizacao de processo existente

- Atualizar dados vindos do DataJud: classe, sistema, formato, orgao julgador, assuntos, grau, nivel de sigilo e data da ultima atualizacao.
- Nao sobrescrever observacoes internas, status manual, cliente, carteira ou responsavel sem acao explicita.
- Se cliente, carteira ou responsavel forem enviados e o campo atual estiver vazio, preencher automaticamente.
- Se o processo ja tiver vinculo, alterar apenas em acao especifica de edicao de vinculo.

## Movimentacoes relevantes

No MVP, a relevancia pode ser heuristica e transparente. Termos iniciais:

- sentenca
- acordao
- decisao
- despacho
- intimacao
- citacao
- transito em julgado
- arquivamento
- extincao
- penhora
- bloqueio
- leilao
- audiencia

`gera_alerta` pode ser marcado para essas movimentacoes, mas a criacao real de alerta deve depender da existencia de tabela/servico de alertas no projeto.

## Mensagens de erro

| Situacao | Mensagem |
| --- | --- |
| CNJ invalido | Numero CNJ invalido. Verifique se ele possui 20 digitos. |
| Processo nao encontrado | Nao encontramos esse processo no tribunal selecionado pelo DataJud. Confira o numero CNJ e o tribunal. |
| Erro DataJud | Nao foi possivel consultar o DataJud agora. A tentativa foi registrada e voce pode tentar novamente em instantes. |
| Sem API Key | Integracao DataJud nao configurada. Defina DATAJUD_API_KEY no ambiente. |

## Tela de processos

Cards de resumo:

- Processos ativos.
- Processos monitorados.
- Movimentacoes novas nos ultimos 7 dias.
- Processos com erro de sincronizacao.
- Processos sem sincronizacao recente.

Tabela:

- Numero CNJ.
- Cliente/condominio.
- Carteira.
- Responsavel.
- Tribunal.
- Classe.
- Orgao julgador.
- Ultima movimentacao.
- Ultima sincronizacao.
- Status.
- Acoes: detalhe, sincronizar, pausar monitoramento, editar vinculo e arquivar.

Filtros:

- Busca textual por numero CNJ.
- Cliente/condominio.
- Carteira.
- Responsavel.
- Tribunal.
- Status do processo.
- Status de monitoramento.
- Ultima movimentacao de/ate.
- Ultima sincronizacao de/ate.

## Novo acompanhamento processual

Formulario simples, preferencialmente inline ou em painel/modal operacional:

- Numero CNJ.
- Tribunal.
- Cliente/condominio.
- Carteira.
- Responsavel.
- Observacoes.
- Checkbox: iniciar monitoramento.

Botao principal: `Consultar e salvar`.

## Pagina de detalhe

Rota: `/modulos/gkit-jur/processos/[id]`

Conteudo:

- Cabecalho com numero CNJ, tribunal, classe, status e botao `Sincronizar agora`.
- Card de dados do processo.
- Card de cliente, carteira e responsavel.
- Card de orgao julgador.
- Card de assuntos.
- Card de ultima sincronizacao e monitoramento.
- Timeline de movimentacoes.
- Historico de sincronizacoes.

## Server Actions e queries

Actions:

- `createGkitJurProcessFromDataJudAction(input)`
- `syncGkitJurProcessAction(processoId)`
- `syncGkitJurProcessByCnjAction(input)`
- `updateGkitJurProcessLinksAction(input)`
- `pauseGkitJurMonitoringAction(processoId)`
- `resumeGkitJurMonitoringAction(processoId)`
- `archiveGkitJurProcessAction(processoId)`

Queries:

- `getGkitJurDashboardMetrics(filters)`
- `listGkitJurProcesses(filters)`
- `getGkitJurProcessById(id)`
- `listGkitJurMovements(processoId)`
- `listGkitJurSyncHistory(processoId)`

As queries devem retornar DTOs simples, sem acoplar UI a linhas brutas do Supabase.

## DTO de listagem

```ts
export type GkitJurProcessListItem = {
  id: string
  numeroCnj: string
  clienteNome: string | null
  carteiraNome: string | null
  responsavelNome: string | null
  tribunalSigla: string | null
  classeNome: string | null
  orgaoJulgadorNome: string | null
  ultimaMovimentacaoEm: string | null
  ultimaSincronizacaoEm: string | null
  status: GkitJurProcessoStatus
  statusMonitoramento: GkitJurMonitoramentoStatus
}
```

## Permissoes previstas

Permissoes iniciais ja existentes:

- `gkit_jur.dashboard.read`
- `gkit_jur.operacao.write`

Permissoes a criar quando o MVP avancar:

- `gkit_jur.processos.read`
- `gkit_jur.processos.write`
- `gkit_jur.processos.sync`
- `gkit_jur.processos.archive`
- `gkit_jur.admin.read`
- `gkit_jur.admin.write`

## Auditoria

Eventos sugeridos:

- `gkit_jur.processo_criado`
- `gkit_jur.processo_sincronizado`
- `gkit_jur.movimentacao_nova`
- `gkit_jur.sincronizacao_erro`
- `gkit_jur.monitoramento_pausado`
- `gkit_jur.monitoramento_retomado`
- `gkit_jur.processo_arquivado`

Se a auditoria central tiver enum restrito de modulos, incluir `gkit_jur` antes de emitir eventos.

## Plano de sprints

### Sprint 0 - Preparacao e alinhamento

Objetivo: deixar o terreno pronto antes de entrar em fluxo juridico real.

Entregas:

- Registrar que a configuracao da chave DataJud ficara para a etapa final de conexao.
- Confirmar decisao final do schema: `gkit_jur`.
- Validar se o schema deve ser exposto ao PostgREST ou acessado apenas server-side.
- Confirmar quais tabelas do Ciclo/Core serao usadas para cliente, carteira e responsavel.
- Revisar permissoes iniciais e criar o mapa final de permissoes do MVP.
- Ajustar textos finais do menu/cockpit, se necessario.

Criterio de aceite:

- Documento de decisoes fechado.
- Modulo acessivel em `/modulos/gkit-jur`.
- MVP planejado para funcionar com estado vazio e erro amigavel enquanto `DATAJUD_API_KEY` nao estiver configurada.
- Build atual continua passando.

### Sprint 1 - Banco e fundacao tecnica

Objetivo: criar a base segura e idempotente do modulo.

Entregas:

- Migration SQL com schema `gkit_jur`.
- Tabelas `processos`, `movimentacoes`, `sincronizacoes` e `monitoramentos`.
- Indices principais.
- Permissoes do MVP.
- Tipos TypeScript base em `features/gkit-jur/types.ts`.
- Normalizador e validador CNJ.
- Lista inicial de tribunais DataJud.
- Queries vazias/seguras para estado inicial.

Criterio de aceite:

- Migration aplicada sem erro.
- Consulta de verificacao confirma tabelas e permissoes.
- `/modulos/gkit-jur` renderiza estado vazio com dados vindos das queries.
- `npm run build` passa.

### Sprint 2 - DataJud e sincronizacao manual

Objetivo: permitir consultar e salvar um processo real por CNJ.

Entregas:

- Client DataJud server-side.
- Tratamento de API key ausente, erro HTTP, timeout e sem resultado.
- Action `syncGkitJurProcessByCnjAction`.
- Persistencia de capa processual em `gkit_jur.processos`.
- Registro de tentativa em `gkit_jur.sincronizacoes`.
- Formulario de novo acompanhamento processual.
- Botao `Consultar e salvar`.

Criterio de aceite:

- Usuario informa CNJ e tribunal.
- Sistema consulta DataJud sem expor chave no client.
- Processo encontrado e salvo.
- Erros aparecem de forma amigavel.
- Historico de sincronizacao e gravado.
- `npm run build` passa.

### Sprint 3 - Movimentacoes e detalhe do processo

Objetivo: tornar o acompanhamento util no dia a dia.

Entregas:

- Persistencia de movimentacoes em `gkit_jur.movimentacoes`.
- Hash deterministico para deduplicacao.
- Atualizacao de `ultima_movimentacao_em` e `ultima_sincronizacao_em`.
- Pagina `/modulos/gkit-jur/processos/[id]`.
- Cabecalho do processo com botao `Sincronizar agora`.
- Cards de capa, vinculos, orgao julgador, assuntos e monitoramento.
- Timeline de movimentacoes.
- Historico de sincronizacoes.

Criterio de aceite:

- Repetir sincronizacao nao duplica movimentacoes.
- Detalhe exibe capa, timeline e historico.
- Botao `Sincronizar agora` atualiza o processo existente.
- `npm run build` passa.

### Sprint 4 - Lista operacional, filtros e vinculos

Objetivo: transformar a pagina de processos em uma tela de trabalho.

Entregas:

- Lista/tabela de processos acompanhados.
- Cards de resumo.
- Filtros por CNJ, cliente, carteira, responsavel, tribunal, status e datas.
- Edicao de vinculos: cliente, carteira e responsavel.
- Acoes: detalhe, sincronizar, pausar monitoramento, retomar monitoramento e arquivar.
- Estados vazios e mensagens de resultado.

Criterio de aceite:

- Lista responde aos filtros.
- Vinculos internos nao sao sobrescritos por sincronizacao automatica.
- Usuario consegue pausar/retomar monitoramento.
- Usuario consegue arquivar processo.
- `npm run build` passa.

### Sprint 5 - Prazos, alertas e agenda inicial

Objetivo: conectar o acompanhamento juridico com a rotina operacional.

Entregas:

- Heuristica de movimentacoes relevantes.
- Marcacao `relevante` e `gera_alerta`.
- Base inicial da tela de prazos.
- Base inicial da tela de agenda.
- Eventos de auditoria para criacao, sincronizacao, erro e arquivamento.
- Stub seguro para timeline/alertas caso a integracao final ainda nao esteja pronta.

Criterio de aceite:

- Movimentacoes relevantes aparecem destacadas.
- Prazos/agenda recebem ao menos uma estrutura inicial consistente.
- Eventos nao quebram o build se o servico final ainda nao existir.
- `npm run build` passa.

### Sprint 6 - Relatorios, acabamento e hardening

Objetivo: preparar o MVP para uso assistido.

Entregas:

- Relatorios iniciais por cliente, carteira, tribunal, responsavel e status.
- Revisao de RLS/permissoes conforme modelo final.
- Auditoria revisada.
- Tratamento de sigilo processual na UI.
- Revisao de performance das queries.
- Testes manuais completos do MVP.
- Ajustes finais de UI/UX.

Criterio de aceite:

- Criterios de aceite do MVP atendidos.
- Nenhuma chave sensivel exposta.
- Sem duplicidade de movimentacoes.
- Build e testes passam.
- Fluxo principal pronto para uso controlado.

## Segurança e RLS

- `DATAJUD_API_KEY` apenas server-side.
- Habilitar RLS em tabelas expostas por PostgREST, caso o schema seja exposto.
- Preferir acesso via server actions/queries com `requireGkitJurContext`.
- Respeitar permissoes por perfil antes de sincronizar, editar, pausar ou arquivar.
- Guardar JSON bruto para rastreabilidade, mas exibir apenas campos uteis na UI.
- Processos com nivel de sigilo devem ter tratamento visual e regra de acesso especifica antes de serem exibidos amplamente.

## Plano de implementacao

### Fase 1 - Base tecnica

- Criar migration SQL idempotente para schema e tabelas.
- Criar tipos TypeScript.
- Criar normalizador/validador CNJ.
- Criar lista inicial de tribunais.
- Criar client DataJud server-side.
- Confirmar variaveis de ambiente em producao.

### Fase 2 - Persistencia

- Upsert de processo.
- Insert e deduplicacao de movimentacoes.
- Registro de sincronizacao.
- Criacao/atualizacao de monitoramento.

### Fase 3 - Actions e API interna

- Sincronizar por CNJ.
- Sincronizar processo existente.
- Atualizar vinculos.
- Arquivar processo.
- Pausar/retomar monitoramento.

### Fase 4 - UI

- Tela principal de processos.
- Formulario de novo acompanhamento.
- Tabela e filtros.
- Pagina de detalhe.
- Timeline de movimentacoes.
- Historico de sincronizacoes.

### Fase 5 - Acabamento

- Estados vazios.
- Loadings e erros.
- Auditoria.
- Permissoes finais.
- Build sem erros.

## Testes obrigatorios

- Abrir `/modulos/gkit-jur` sem erro.
- Renderizar estado vazio.
- Cadastrar processo por CNJ valido.
- Consultar DataJud com tribunal selecionado.
- Salvar processo e movimentacoes.
- Sincronizar novamente sem duplicar movimentacoes.
- Abrir detalhe do processo.
- Ver timeline de movimentacoes.
- Filtrar por tribunal, status, cliente, carteira e responsavel.
- Simular DataJud sem API key.
- Simular processo nao encontrado.
- Simular erro HTTP ou timeout.
- Rodar `npm run build`.

## Criterios de aceite do MVP

- Menu GKIT Jur aparece corretamente.
- Rota principal carrega sem erro.
- Usuario informa CNJ e tribunal.
- Sistema consulta DataJud server-side.
- Processo e salvo em `gkit_jur.processos`.
- Movimentacoes sao salvas em `gkit_jur.movimentacoes`.
- Repetir sincronizacao nao duplica movimentacoes.
- Historico e salvo em `gkit_jur.sincronizacoes`.
- Pagina de detalhe exibe capa, vinculos, timeline e historico.
- Erros sao tratados sem quebrar a aplicacao.
- Nenhuma chave DataJud e exposta ao client.
- `npm run build` finaliza com sucesso.

## Evolucoes futuras

- Monitoramento automatico por job.
- Busca multi-tribunal por CNJ.
- Alertas por responsavel.
- Classificacao automatica de movimentacoes.
- Integracao com agenda e prazos.
- Integracao com publicacoes/intimacoes.
- Integracao com APIs privadas de tribunais e fornecedores juridicos.
- Relatorios por cliente, carteira, tribunal e responsavel.
- Ranking operacional de acompanhamento processual.
- Notificacoes por e-mail ou WhatsApp.
- IA para resumir movimentacoes e sugerir providencias.
- Analise de risco processual.
- SLA por movimentacao relevante.

## Referencias

- PDF original: `C:\Users\Genske\Downloads\GKIT-JUR_Especificacao_Tecnica_Funcional.pdf`.
- DataJud Wiki - API Publica: `https://datajud-wiki.cnj.jus.br/api-publica/`.
- DataJud Wiki - Acesso: `https://datajud-wiki.cnj.jus.br/api-publica/acesso/`.
- DataJud Wiki - Endpoints: `https://datajud-wiki.cnj.jus.br/api-publica/endpoints/`.
- CNJ - API Publica DataJud: `https://www.cnj.jus.br/sistemas/datajud/api-publica/`.
