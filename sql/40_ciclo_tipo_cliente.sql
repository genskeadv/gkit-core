alter table ciclo.clientes
  add column if not exists tipo_cliente text not null default 'mensal';

alter table ciclo.clientes
  drop constraint if exists clientes_tipo_cliente_chk;

alter table ciclo.clientes
  add constraint clientes_tipo_cliente_chk
  check (tipo_cliente in ('mensal', 'pontual', 'cobranca'));

update ciclo.clientes
set tipo_cliente = case
  when lower(coalesce(metadata->>'tipo_carteira_planilha', '')) in ('mensal', 'pontual') then lower(metadata->>'tipo_carteira_planilha')
  when lower(coalesce(metadata->>'tipo_carteira_planilha', '')) in ('cobrança', 'cobranca') then 'cobranca'
  else tipo_cliente
end
where metadata ? 'tipo_carteira_planilha';

notify pgrst, 'reload schema';
