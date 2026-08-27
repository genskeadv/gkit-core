alter table ciclo.onboarding_workflow_atividades
  add column if not exists etapa text not null default 'operacao';

alter table ciclo.onboarding_cliente_atividades
  add column if not exists etapa text not null default 'operacao';

with workflow_etapas as (
  select
    id,
    case
      when ordem in (10, 20, 40, 50)
        or lower(descricao) like '%contrato%'
        or lower(descricao) like '%cliente nos sistemas%'
        or lower(descricao) like '%atribuir carteira%'
        then 'cadastro'
      when ordem in (30, 70, 80, 90, 120)
        or lower(descricao) like '%boas vindas%'
        or lower(descricao) like '%recepcao%'
        or lower(descricao) like '%recepção%'
        or lower(descricao) like '%apresentar equipe%'
        or lower(descricao) like '%whatsapp%'
        or lower(descricao) like '%video%'
        or lower(descricao) like '%vídeo%'
        then 'recepcao'
      when ordem = 100
        or lower(descricao) like '%document%'
        or lower(descricao) like '%checklist%'
        or lower(descricao) like '%validar%'
        or lower(descricao) like '%receber%'
        then 'documentacao'
      else 'operacao'
    end as etapa
  from ciclo.onboarding_workflow_atividades
)
update ciclo.onboarding_workflow_atividades workflow
set etapa = workflow_etapas.etapa,
    updated_at = now()
from workflow_etapas
where workflow.id = workflow_etapas.id;

update ciclo.onboarding_cliente_atividades atividade
set etapa = workflow.etapa,
    updated_at = now()
from ciclo.onboarding_workflow_atividades workflow
where atividade.atividade_id = workflow.id;

with atividades_sem_template as (
  select
    id,
    case
      when ordem in (10, 20, 40, 50)
        or lower(descricao) like '%contrato%'
        or lower(descricao) like '%cliente nos sistemas%'
        or lower(descricao) like '%atribuir carteira%'
        then 'cadastro'
      when ordem in (30, 70, 80, 90, 120)
        or lower(descricao) like '%boas vindas%'
        or lower(descricao) like '%recepcao%'
        or lower(descricao) like '%recepção%'
        or lower(descricao) like '%apresentar equipe%'
        or lower(descricao) like '%whatsapp%'
        or lower(descricao) like '%video%'
        or lower(descricao) like '%vídeo%'
        then 'recepcao'
      when ordem = 100
        or lower(descricao) like '%document%'
        or lower(descricao) like '%checklist%'
        or lower(descricao) like '%validar%'
        or lower(descricao) like '%receber%'
        then 'documentacao'
      else 'operacao'
    end as etapa
  from ciclo.onboarding_cliente_atividades
  where atividade_id is null
)
update ciclo.onboarding_cliente_atividades atividade
set etapa = atividades_sem_template.etapa,
    updated_at = now()
from atividades_sem_template
where atividade.id = atividades_sem_template.id;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'onboarding_workflow_atividades_etapa_check'
      and conrelid = 'ciclo.onboarding_workflow_atividades'::regclass
  ) then
    alter table ciclo.onboarding_workflow_atividades
      add constraint onboarding_workflow_atividades_etapa_check
      check (etapa in ('cadastro', 'recepcao', 'documentacao', 'operacao'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'onboarding_cliente_atividades_etapa_check'
      and conrelid = 'ciclo.onboarding_cliente_atividades'::regclass
  ) then
    alter table ciclo.onboarding_cliente_atividades
      add constraint onboarding_cliente_atividades_etapa_check
      check (etapa in ('cadastro', 'recepcao', 'documentacao', 'operacao'));
  end if;
end $$;

create index if not exists onboarding_workflow_atividades_etapa_idx
  on ciclo.onboarding_workflow_atividades (etapa, ordem);

create index if not exists onboarding_cliente_atividades_etapa_idx
  on ciclo.onboarding_cliente_atividades (cliente_id, etapa, ordem);

notify pgrst, 'reload schema';
