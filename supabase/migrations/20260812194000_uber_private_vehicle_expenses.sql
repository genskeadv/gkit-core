begin;

alter table public.colab_uber_despesas
  add column if not exists veiculo_proprio boolean not null default false,
  add column if not exists quilometragem numeric(10,2),
  add column if not exists custo_por_km numeric(10,2);

alter table public.colab_uber_despesas
  alter column recibo_path drop not null,
  alter column recibo_nome drop not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'colab_uber_despesas_quilometragem_check'
      and conrelid = 'public.colab_uber_despesas'::regclass
  ) then
    alter table public.colab_uber_despesas
      add constraint colab_uber_despesas_quilometragem_check
      check (quilometragem is null or quilometragem > 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'colab_uber_despesas_custo_por_km_check'
      and conrelid = 'public.colab_uber_despesas'::regclass
  ) then
    alter table public.colab_uber_despesas
      add constraint colab_uber_despesas_custo_por_km_check
      check (custo_por_km is null or custo_por_km > 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'colab_uber_despesas_recibo_ou_veiculo_check'
      and conrelid = 'public.colab_uber_despesas'::regclass
  ) then
    alter table public.colab_uber_despesas
      add constraint colab_uber_despesas_recibo_ou_veiculo_check
      check (veiculo_proprio or recibo_path is not null);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'colab_uber_despesas_veiculo_proprio_campos_check'
      and conrelid = 'public.colab_uber_despesas'::regclass
  ) then
    alter table public.colab_uber_despesas
      add constraint colab_uber_despesas_veiculo_proprio_campos_check
      check (
        not veiculo_proprio
        or (
          quilometragem is not null
          and quilometragem > 0
          and custo_por_km is not null
          and custo_por_km > 0
        )
      );
  end if;
end $$;

commit;
