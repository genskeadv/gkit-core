-- Flex - complemento de colaboradores e tipos de recebimento.

alter table flex.colaboradores
  add column if not exists data_inicio date,
  add column if not exists participacao_honorarios numeric(14,2) not null default 0,
  add column if not exists recebe_salario boolean not null default false,
  add column if not exists recebe_participacao_honorarios boolean not null default false,
  add column if not exists recebe_pro_labore boolean not null default false,
  add column if not exists recebe_beneficios boolean not null default false,
  add column if not exists recebe_outros boolean not null default false,
  add column if not exists recebe_comissoes boolean not null default true;

update flex.colaboradores
set
  recebe_salario = true
where salario > 0
  and recebe_salario = false;

update flex.colaboradores
set
  recebe_pro_labore = true
where pro_labore > 0
  and recebe_pro_labore = false;

update flex.colaboradores
set
  recebe_beneficios = true
where beneficio_valor > 0
  and recebe_beneficios = false;

update flex.colaboradores
set
  recebe_outros = true
where (ajuda_custo > 0 or outros_vencimentos > 0)
  and recebe_outros = false;

create index if not exists idx_flex_colaboradores_time
  on flex.colaboradores(time_id);

create index if not exists idx_flex_colaboradores_gestor
  on flex.colaboradores(gestor_usuario_id);

grant usage on schema flex to authenticated, service_role;
grant select, insert, update, delete on flex.colaboradores to authenticated, service_role;

comment on column flex.colaboradores.data_inicio is 'Data de inicio do colaborador no fluxo operacional do Flex.';
comment on column flex.colaboradores.participacao_honorarios is 'Valor recorrente de participacao em honorarios.';
comment on column flex.colaboradores.recebe_salario is 'Indica se salario e um tipo de recebimento aplicavel.';
comment on column flex.colaboradores.recebe_participacao_honorarios is 'Indica se participacao em honorarios e aplicavel.';
comment on column flex.colaboradores.recebe_pro_labore is 'Indica se pro-labore e um tipo de recebimento aplicavel.';
comment on column flex.colaboradores.recebe_beneficios is 'Indica se beneficios sao aplicaveis.';
comment on column flex.colaboradores.recebe_outros is 'Indica se outros vencimentos sao aplicaveis.';
comment on column flex.colaboradores.recebe_comissoes is 'Indica se o colaborador participa do calculo de comissoes.';
