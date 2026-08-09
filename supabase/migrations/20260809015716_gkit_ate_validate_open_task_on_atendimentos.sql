-- Keep the existing task-side invariant and also guard direct status changes
-- on atendimentos. Do not attach this to INSERT yet: the current application
-- creates the atendimento and its first tarefa through separate Supabase calls.
drop trigger if exists validar_atendimento_com_tarefa_aberta_atendimentos on gkit_ate.atendimentos;

create constraint trigger validar_atendimento_com_tarefa_aberta_atendimentos
after update of status on gkit_ate.atendimentos
deferrable initially deferred
for each row
when (new.status = 'aberto')
execute function gkit_ate.validar_atendimento_com_tarefa_aberta();
