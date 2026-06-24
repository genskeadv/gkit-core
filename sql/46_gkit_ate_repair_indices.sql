-- GKIT ATE - reparo dos indices/cadastros apos falha de cola no SQL Editor.
-- Use se o SQL Editor acusar erro em uma linha truncada como `gkit_ate.tar;`.

begin;

create index if not exists gkit_ate_atendimento_tipos_slug_idx
  on gkit_ate.atendimento_tipos (slug);

create index if not exists gkit_ate_tarefa_tipos_slug_idx
  on gkit_ate.tarefa_tipos (slug);

create index if not exists gkit_ate_atendimentos_cliente_idx
  on gkit_ate.atendimentos (cliente_nome);

create index if not exists gkit_ate_atendimentos_codigo_publico_idx
  on gkit_ate.atendimentos (codigo_publico);

create index if not exists gkit_ate_atendimentos_tipo_idx
  on gkit_ate.atendimentos (atendimento_tipo_id);

create index if not exists gkit_ate_atendimentos_status_idx
  on gkit_ate.atendimentos (status, data_criacao desc);

create index if not exists gkit_ate_atendimentos_responsavel_idx
  on gkit_ate.atendimentos (responsavel);

create index if not exists gkit_ate_tarefas_atendimento_idx
  on gkit_ate.tarefas (atendimento_id);

create index if not exists gkit_ate_tarefas_tipo_idx
  on gkit_ate.tarefas (tarefa_tipo_id);

create index if not exists gkit_ate_tarefas_status_idx
  on gkit_ate.tarefas (status, data_prevista);

create index if not exists gkit_ate_import_itens_lote_idx
  on gkit_ate.import_itens (lote_id, linha);

commit;
