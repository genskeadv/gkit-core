-- GKIT New - Sprint 2
-- Regras de oportunidades, workflow e cancelamento automatico de pendencias.

begin;

create or replace function gkit_new.cancelar_tarefas_pendentes_oportunidade(
  p_oportunidade_id uuid,
  p_usuario_id uuid,
  p_motivo text
)
returns integer
language plpgsql
as $$
declare
  v_total integer;
begin
  update gkit_new.tarefas
  set
    status = 'cancelada',
    atualizado_em = now()
  where oportunidade_id = p_oportunidade_id
    and status = 'pendente';

  get diagnostics v_total = row_count;

  if v_total > 0 then
    insert into gkit_new.eventos (entidade, entidade_id, usuario_id, tipo, descricao, metadata)
    values (
      'oportunidade',
      p_oportunidade_id,
      p_usuario_id,
      'workflow_cancelado',
      p_motivo,
      jsonb_build_object('tarefas_canceladas', v_total)
    );
  end if;

  return v_total;
end;
$$;

create or replace function gkit_new.sincronizar_oportunidade()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and old.cliente_id is distinct from new.cliente_id then
    perform gkit_new.recalcular_status_cliente(old.cliente_id);
  end if;

  perform gkit_new.recalcular_status_cliente(new.cliente_id);

  if tg_op = 'INSERT' then
    perform gkit_new.criar_tarefas_oportunidade(new.id);
  end if;

  return new;
end;
$$;

drop trigger if exists sincronizar_oportunidade on gkit_new.oportunidades;
create trigger sincronizar_oportunidade
after insert or update on gkit_new.oportunidades
for each row execute function gkit_new.sincronizar_oportunidade();

commit;
