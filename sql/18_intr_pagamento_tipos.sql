-- GKLI Core - Intr tipos de pagamento
-- Execute depois de 17_intr_agenda_por_tipo_pagamento.sql.

create table if not exists gkli_intr.pagamento_tipos (
  id uuid default gen_random_uuid() not null,
  codigo text not null,
  nome text not null,
  categoria text,
  ativo boolean default true not null,
  observacao text,
  criado_em timestamp with time zone default now() not null,
  atualizado_em timestamp with time zone default now() not null,
  constraint pagamento_tipos_pkey primary key (id),
  constraint pagamento_tipos_codigo_key unique (codigo),
  constraint pagamento_tipos_nome_key unique (nome)
);

insert into gkli_intr.pagamento_tipos (codigo, nome, categoria)
values
  ('salarios', 'Salarios', 'fixo'),
  ('pro_labore', 'Pro-labore', 'fixo'),
  ('participacao_honorarios_fixos', 'Participacao em honorarios fixos', 'fixo'),
  ('beneficios', 'Beneficios', 'fixo'),
  ('comissoes', 'Comissoes', 'variavel'),
  ('ajuda_custo', 'Ajuda de custo', 'fixo'),
  ('reembolso', 'Reembolso', 'eventual'),
  ('outros', 'Outros', 'eventual')
on conflict (codigo) do update set
  nome = excluded.nome,
  categoria = excluded.categoria,
  ativo = true;

drop trigger if exists trg_pagamento_tipos_updated_at on gkli_intr.pagamento_tipos;
create trigger trg_pagamento_tipos_updated_at before update on gkli_intr.pagamento_tipos for each row execute function core.set_atualizado_em();

alter table gkli_intr.pagamento_tipos enable row level security;

drop policy if exists intr_service_pagamento_tipos on gkli_intr.pagamento_tipos;
create policy intr_service_pagamento_tipos on gkli_intr.pagamento_tipos for all to service_role using (true) with check (true);

drop policy if exists intr_authenticated_read_pagamento_tipos on gkli_intr.pagamento_tipos;
create policy intr_authenticated_read_pagamento_tipos on gkli_intr.pagamento_tipos for select to authenticated using (true);

grant select on gkli_intr.pagamento_tipos to authenticated, service_role;
grant insert, update, delete on gkli_intr.pagamento_tipos to service_role;
