-- GKLI Core - Intr agenda por tipo de pagamento
-- Execute depois de 15_intr_agenda_pagamento_percentual.sql.

alter table gkli_intr.pagamento_agendas
  alter column colaborador_id drop not null;

drop index if exists gkli_intr.pagamentos_agenda_competencia_uidx;
drop index if exists pagamentos_agenda_competencia_uidx;

create unique index if not exists pagamentos_agenda_colaborador_competencia_uidx
  on gkli_intr.pagamentos (agenda_id, colaborador_id, competencia)
  where agenda_id is not null;

drop view if exists public.gkli_intr_pagamento_agendas_resumo cascade;

create view public.gkli_intr_pagamento_agendas_resumo
with (security_invoker = true) as
select
  a.id,
  a.colaborador_id,
  c.nome as colaborador_nome,
  t.nome as time_nome,
  a.tipo,
  a.descricao,
  a.dia_previsto,
  a.percentual,
  a.valor_bruto,
  a.valor_descontos,
  a.valor_liquido,
  a.inicio_competencia,
  a.fim_competencia,
  a.ativo,
  a.origem,
  a.observacao,
  a.criado_em,
  a.atualizado_em
from gkli_intr.pagamento_agendas a
left join gkli_intr.colaboradores c on c.id = a.colaborador_id
left join gkli_intr.times t on t.id = c.time_id;

grant select on public.gkli_intr_pagamento_agendas_resumo to authenticated, service_role;
