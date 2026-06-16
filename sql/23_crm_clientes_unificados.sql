-- CRM: clientes unificados por CNPJ.
-- Mantem a tabela fisica crm.empresas por compatibilidade com o modulo atual,
-- mas passa a tratar cada registro como Cliente.

update crm.empresas
set documento = regexp_replace(coalesce(documento, ''), '\D', '', 'g')
where documento is not null;

do $$
begin
  if exists (
    select 1
    from crm.empresas
    where nullif(regexp_replace(coalesce(documento, ''), '\D', '', 'g'), '') is null
  ) then
    raise exception 'Existem clientes CRM sem CNPJ. Preencha documento antes de aplicar a migracao.';
  end if;

  if exists (
    select 1
    from crm.empresas
    where length(regexp_replace(coalesce(documento, ''), '\D', '', 'g')) <> 14
  ) then
    raise exception 'Existem clientes CRM com CNPJ invalido. Corrija documentos para 14 digitos antes de aplicar a migracao.';
  end if;

  if exists (
    select 1
    from crm.empresas
    group by documento
    having count(*) > 1
  ) then
    raise exception 'Existem clientes CRM com CNPJ duplicado. Una os cadastros antes de aplicar a migracao.';
  end if;
end $$;

alter table crm.empresas
  alter column documento set not null;

alter table crm.empresas
  drop constraint if exists empresas_documento_cnpj_chk;

alter table crm.empresas
  add constraint empresas_documento_cnpj_chk
  check (documento ~ '^[0-9]{14}$');

create unique index if not exists empresas_documento_cnpj_uidx
  on crm.empresas (documento);

update crm.empresas empresa
set
  tipo = 'PJ',
  status = case
    when exists (
      select 1
      from crm.oportunidades oportunidade
      join crm.propostas proposta on proposta.oportunidade_id = oportunidade.id
      where oportunidade.empresa_id = empresa.id
        and proposta.status = 'aprovada'
    ) then 'ativo'
    else 'prospecto'
  end;

create or replace function crm.sincronizar_status_cliente_por_oportunidade(v_oportunidade_id uuid)
returns void
language plpgsql
as $$
declare
  v_empresa_id uuid;
begin
  if v_oportunidade_id is null then
    return;
  end if;

  select empresa_id
    into v_empresa_id
  from crm.oportunidades
  where id = v_oportunidade_id;

  if v_empresa_id is null then
    return;
  end if;

  update crm.empresas empresa
  set status = case
    when exists (
      select 1
      from crm.oportunidades oportunidade
      join crm.propostas proposta on proposta.oportunidade_id = oportunidade.id
      where oportunidade.empresa_id = v_empresa_id
        and proposta.status = 'aprovada'
    ) then 'ativo'
    else 'prospecto'
  end
  where empresa.id = v_empresa_id;
end;
$$;

create or replace function crm.sincronizar_status_cliente_por_proposta()
returns trigger
language plpgsql
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform crm.sincronizar_status_cliente_por_oportunidade(old.oportunidade_id);
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    perform crm.sincronizar_status_cliente_por_oportunidade(new.oportunidade_id);
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_crm_propostas_status_cliente on crm.propostas;

create trigger trg_crm_propostas_status_cliente
after insert or update or delete on crm.propostas
for each row
execute function crm.sincronizar_status_cliente_por_proposta();
