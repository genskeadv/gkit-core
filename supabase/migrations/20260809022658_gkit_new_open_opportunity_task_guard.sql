begin;

create or replace function gkit_new.validar_oportunidade_com_tarefa_pendente()
returns trigger
language plpgsql
as $$
begin
  if new.status in ('nova', 'proposta_enviada', 'em_negociacao')
    and exists (
      select 1
      from gkit_new.tarefa_modelos modelo
      where modelo.ativo = true
    )
    and not exists (
      select 1
      from gkit_new.tarefas tarefa
      where tarefa.oportunidade_id = new.id
        and tarefa.status = 'pendente'
    )
  then
    raise exception 'Oportunidade aberta precisa ter ao menos uma tarefa pendente no workflow.';
  end if;

  return new;
end;
$$;

drop trigger if exists validar_oportunidade_com_tarefa_pendente on gkit_new.oportunidades;

create constraint trigger validar_oportunidade_com_tarefa_pendente
after insert or update of status on gkit_new.oportunidades
deferrable initially deferred
for each row
when (new.status in ('nova', 'proposta_enviada', 'em_negociacao'))
execute function gkit_new.validar_oportunidade_com_tarefa_pendente();

commit;
