# GKIT Jur - Caixa de entrada de publicacoes

## Decisao de produto

O GKIT Jur nao deve ser um repositorio permanente de todas as publicacoes, intimacoes e movimentacoes brutas. A fonte formal continua sendo o processo digital, diario oficial, AASP, DataJud ou outro provedor juridico.

O papel do GKIT Jur e garantir tratamento operacional: toda publicacao capturada deve entrar em uma caixa de entrada, receber triagem, ser confirmada ou dispensada por uma pessoa e deixar uma trilha minima de decisao.

Em termos praticos, o item "Movimentacoes" deixa de ser a fila principal de trabalho e passa a ser contexto do processo. A fila principal vira "Publicacoes e intimacoes".

## Principios

- Guardar o necessario para provar que a publicacao foi capturada e tratada.
- Nao depender do resumo inteligente como prova de completude.
- Usar IA para sugerir classificacao, tarefa, prazo e prioridade, mas exigir confirmacao humana para concluir o tratamento.
- Permitir remover ou arquivar o conteudo pesado depois de um prazo configuravel.
- Nunca remover o registro minimo de tratamento enquanto ele for necessario para auditoria operacional.
- Conciliar fontes diferentes sem assumir equivalencia perfeita entre AASP, DataJud e diario/processo digital.

## Fora do escopo

- Armazenar permanentemente o texto integral de todas as publicacoes.
- Substituir o processo digital como fonte formal.
- Concluir tratamento automaticamente apenas pela sugestao da IA.
- Criar prazos processuais definitivos sem revisao humana.

## Fluxo operacional

1. Captura
   - AASP, DataJud ou outra fonte retorna uma publicacao, intimacao ou comunicacao.
   - O sistema normaliza os identificadores: CNJ, data, fonte, jornal, arq/pub quando existirem, hash e preview.

2. Entrada na caixa
   - O item entra com status `pendente`.
   - Duplicidades sao detectadas por chave de fonte e por hash normalizado.
   - Se o processo nao existir, o item fica em fila de vinculacao.

3. Triagem inteligente
   - A IA sugere tipo de tratamento, prioridade, tarefa, prazo provavel e justificativa.
   - A sugestao fica como apoio, nao como decisao final.

4. Confirmacao humana
   - O usuario confirma, edita ou dispensa a sugestao.
   - Se houver providencia, o sistema cria ou vincula tarefa/prazo/documento.
   - Se nao houver providencia, o usuario registra motivo de dispensa.

5. Saida da caixa
   - Itens `tratada`, `dispensada` ou `duplicada` saem da visao principal.
   - Permanecem disponiveis em historico/filtro de auditoria.

6. Retencao
   - O texto completo e o payload bruto podem ser removidos ou movidos para arquivo apos X dias.
   - O registro minimo permanece: fonte, data, CNJ, hash, preview, status, decisao, usuario, data de tratamento e vinculos.

## Estados

| Status | Significado |
| --- | --- |
| `pendente` | Capturada e ainda nao analisada. |
| `triada_ia` | IA sugeriu classificacao, mas nao houve confirmacao humana. |
| `em_tratamento` | Usuario assumiu ou existe tarefa vinculada ainda aberta. |
| `tratada` | Providencia confirmada e concluida, com evidencia operacional. |
| `dispensada` | Humano confirmou que nao exige acao, com motivo registrado. |
| `duplicada` | Item equivalente ja existe ou ja foi tratado por outra fonte. |
| `erro` | Captura, normalizacao ou vinculacao falhou e exige revisao. |

## Decisoes de tratamento

Valores iniciais para `decisao_tratamento`:

- `gerar_prazo`
- `gerar_tarefa`
- `registrar_ciencia`
- `vincular_documento`
- `atualizar_resumo`
- `dispensar_sem_acao`
- `marcar_duplicada`
- `revisar_cadastro_processo`

## Modelo de dados sugerido

Tabela principal: `gkit_jur.publicacoes_monitoradas`.

Campos essenciais:

```sql
id uuid primary key default gen_random_uuid(),
processo_id uuid references gkit_jur.processos(id) on delete set null,
numero_cnj_limpo text not null,
fonte text not null,
fonte_evento_id text,
data_disponibilizacao date,
data_publicacao date,
jornal text,
termo text,
origem_orgao text,
arq text,
pub text,
texto_preview text,
texto_hash text not null,
payload_hash text,
raw_payload jsonb,
texto_completo text,
status text not null default 'pendente',
decisao_tratamento text,
classificacao_ia jsonb not null default '{}'::jsonb,
confianca_ia numeric,
sugestao_ia text,
tarefa_id uuid references gkit_jur.tarefas(id) on delete set null,
prazo_id uuid,
tratado_por uuid,
tratado_em timestamptz,
motivo_tratamento text,
conteudo_retido_ate timestamptz,
conteudo_removido_em timestamptz,
created_at timestamptz not null default now(),
updated_at timestamptz not null default now()
```

Indices e unicidade sugeridos:

```sql
create unique index gkit_jur_publicacoes_fonte_evento_unique
  on gkit_jur.publicacoes_monitoradas(fonte, fonte_evento_id)
  where fonte_evento_id is not null;

create index idx_gkit_jur_publicacoes_caixa
  on gkit_jur.publicacoes_monitoradas(status, data_disponibilizacao desc nulls last);

create index idx_gkit_jur_publicacoes_processo
  on gkit_jur.publicacoes_monitoradas(processo_id, data_disponibilizacao desc nulls last);

create index idx_gkit_jur_publicacoes_hash
  on gkit_jur.publicacoes_monitoradas(numero_cnj_limpo, texto_hash);
```

## Relacao com movimentacoes

`gkit_jur.movimentacoes` continua existindo, mas deixa de ser a unica prova operacional. Ela deve servir para:

- timeline do processo;
- contexto do resumo inteligente;
- historico importado do DataJud;
- evidencias que nao sejam publicacoes/intimacoes;
- relacionamento com publicacoes quando a fonte retornar a publicacao como movimento.

Quando uma publicacao gerar movimento, o movimento deve referenciar a publicacao monitorada por metadata ou coluna futura. A deduplicacao deve considerar tanto o hash do movimento quanto o hash da publicacao.

## Relacao com tarefas

A IA pode sugerir tarefas, mas a caixa nao deve concluir tratamento sozinha.

Regras:

- Um item pendente pode nao ter tarefa.
- Um item com providencia confirmada deve ter tarefa, prazo, ciencia ou motivo de dispensa.
- Tarefas de publicacao podem continuar consolidadas por processo/regra, mas o payload deve preservar os IDs das publicacoes monitoradas.
- Fechar uma tarefa vinculada pode marcar publicacoes como `tratada` apenas se a acao exigir confirmacao explicita.

## Relacao com resumo inteligente

O resumo inteligente pode usar publicacoes tratadas e pendentes como insumo, mas nao substitui a caixa.

O resumo deve responder perguntas como:

- ha publicacoes pendentes?
- ha publicacoes tratadas que mudam a fase do processo?
- ha prazo ou providencia aberta?
- ha divergencia entre fontes?

O resumo nao deve ser usado para provar que uma publicacao foi tratada.

## Retencao

Politica recomendada:

- Itens pendentes ou em tratamento: manter conteudo completo.
- Itens tratados/dispensados recentes: manter conteudo completo por X dias.
- Apos X dias: remover `texto_completo` e, se necessario, compactar `raw_payload`.
- Sempre manter metadados minimos, hash, decisao e vinculos.

Configuracoes sugeridas:

```env
GKIT_JUR_PUBLICATION_CONTENT_RETENTION_DAYS=90
GKIT_JUR_PUBLICATION_RAW_PAYLOAD_RETENTION_DAYS=180
```

## Criterio de garantia

O indicador correto nao e "processo atualizado". O indicador correto e cobertura de tratamento:

- total capturado no periodo;
- total pendente;
- total triado por IA;
- total confirmado por humano;
- total tratado;
- total dispensado;
- total duplicado;
- total com erro de vinculacao.

Um processo pode estar atualizado no DataJud e ainda assim ter publicacao pendente de tratamento. Da mesma forma, uma publicacao pode estar tratada sem que o texto completo permaneca armazenado no GKIT Jur.

## Permissoes e seguranca

A tabela deve seguir o padrao de escopo do `gkit_jur`:

- leitura para usuarios autenticados com acesso ao modulo;
- escrita apenas para service role, integracoes server-side e usuarios com permissao operacional;
- confirmacao de tratamento restrita a permissao de escrita do modulo;
- payload bruto e texto completo nunca devem ser expostos em listagens amplas quando o preview for suficiente;
- RLS deve considerar carteira, responsavel e regras transversais ja adotadas pelo modulo.

## Telas esperadas

### Caixa de entrada

Lista operacional com filtros:

- status;
- fonte;
- data de disponibilizacao;
- processo;
- cliente/carteira/responsavel;
- tipo sugerido pela IA;
- prioridade sugerida;
- itens sem processo vinculado;
- divergencias entre fontes.

Acoes:

- abrir publicacao;
- aceitar sugestao da IA;
- editar classificacao;
- criar tarefa/prazo;
- dispensar com motivo;
- marcar duplicada;
- vincular a processo;
- solicitar revisao.

### Detalhe do processo

O processo deve mostrar:

- publicacoes pendentes;
- publicacoes tratadas recentes;
- tarefas/prazos derivados;
- resumo inteligente;
- timeline de movimentacoes como contexto.

### Cockpit

O cockpit deve priorizar:

- publicacoes pendentes;
- publicacoes com sugestao de prazo;
- itens sem processo vinculado;
- erros de captura;
- prazos/tarefas confirmados.

## Perguntas em aberto

- Qual prazo padrao para remover conteudo completo: 30, 60, 90 ou 180 dias?
- Publicacoes dispensadas devem exigir motivo obrigatorio?
- Quem pode confirmar tratamento: qualquer usuario com escrita no modulo ou somente responsavel/carteira?
- Devemos importar relatorios AASP XLSX para a mesma caixa como fonte `aasp_relatorio`?
- A tarefa consolidada deve tratar varias publicacoes em lote ou exigir decisao individual por publicacao?
