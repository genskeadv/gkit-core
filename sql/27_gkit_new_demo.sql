-- GKIT New - dados demo
-- Execute depois de:
-- 24_gkit_new_bootstrap.sql
-- 25_gkit_new_sprint2.sql
-- 26_gkit_new_sprint3.sql

begin;

with actor as (
  select (
    select id
    from security.usuarios
    where status = 'ativo'
    order by nome nulls last, email nulls last, id
    limit 1
  ) as id
),
workflow_rows as (
  select *
  from (
    values
      ('11111111-1111-4111-8111-111111111111'::uuid, 'Enviar Proposta', 3, 10),
      ('11111111-1111-4111-8111-111111111112'::uuid, 'Primeiro acompanhamento', 7, 20),
      ('11111111-1111-4111-8111-111111111113'::uuid, 'Segundo acompanhamento', 15, 30),
      ('11111111-1111-4111-8111-111111111114'::uuid, 'Acompanhamento final', 20, 40),
      ('11111111-1111-4111-8111-111111111115'::uuid, 'Encerramento', 30, 50)
  ) as row(id, descricao, dias, ordem)
)
insert into gkit_new.tarefa_modelos (
  id,
  descricao,
  dias,
  ordem,
  responsavel_id,
  ativo,
  criado_por,
  atualizado_por
)
select
  workflow_rows.id,
  workflow_rows.descricao,
  workflow_rows.dias,
  workflow_rows.ordem,
  actor.id,
  true,
  actor.id,
  actor.id
from workflow_rows
cross join actor
on conflict (id) do update
set
  descricao = excluded.descricao,
  dias = excluded.dias,
  ordem = excluded.ordem,
  responsavel_id = excluded.responsavel_id,
  ativo = true,
  atualizado_por = excluded.atualizado_por,
  atualizado_em = now();

with actor as (
  select (
    select id
    from security.usuarios
    where status = 'ativo'
    order by nome nulls last, email nulls last, id
    limit 1
  ) as id
),
cliente_rows as (
  select *
  from (
    values
      ('22222222-2222-4222-8222-222222222201'::uuid, 'Condominio Horizonte Azul', '11222333000181', 'Cliente ativo de administracao condominial.'),
      ('22222222-2222-4222-8222-222222222202'::uuid, 'Edificio Alameda Prime', '22333444000172', 'Prospecto em negociacao para implantacao do Ciclo.'),
      ('22222222-2222-4222-8222-222222222203'::uuid, 'Residencial Jardim Norte', '33444555000163', 'Prospecto novo indicado por cliente ativo.'),
      ('22222222-2222-4222-8222-222222222204'::uuid, 'Marina Costa Sul Empreendimentos', '44555666000154', 'Cliente encerrado no ciclo comercial atual.'),
      ('22222222-2222-4222-8222-222222222205'::uuid, 'Ana Paula Mendes', '12345678901', 'Pessoa fisica em estudo para servico pontual.')
  ) as row(id, nome, documento, observacoes)
)
insert into gkit_new.clientes (
  id,
  nome,
  documento,
  documento_tipo,
  documento_normalizado,
  observacoes,
  criado_por,
  atualizado_por
)
select
  cliente_rows.id,
  cliente_rows.nome,
  cliente_rows.documento,
  case when length(cliente_rows.documento) = 11 then 'cpf' else 'cnpj' end,
  cliente_rows.documento,
  cliente_rows.observacoes,
  actor.id,
  actor.id
from cliente_rows
cross join actor
on conflict (id) do update
set
  nome = excluded.nome,
  documento = excluded.documento,
  observacoes = excluded.observacoes,
  atualizado_por = excluded.atualizado_por,
  atualizado_em = now();

with actor as (
  select (
    select id
    from security.usuarios
    where status = 'ativo'
    order by nome nulls last, email nulls last, id
    limit 1
  ) as id
),
contato_rows as (
  select *
  from (
    values
      ('33333333-3333-4333-8333-333333333301'::uuid, 'Mariana Prado', 'Sindica profissional', 'mariana.prado.demo@gkit.local', '(11) 98800-0101'),
      ('33333333-3333-4333-8333-333333333302'::uuid, 'Ricardo Neves', 'Conselheiro fiscal', 'ricardo.neves.demo@gkit.local', '(11) 98800-0202'),
      ('33333333-3333-4333-8333-333333333303'::uuid, 'Camila Torres', 'Administradora predial', 'camila.torres.demo@gkit.local', '(21) 98800-0303'),
      ('33333333-3333-4333-8333-333333333304'::uuid, 'Eduardo Lima', 'Diretor financeiro', 'eduardo.lima.demo@gkit.local', '(41) 98800-0404'),
      ('33333333-3333-4333-8333-333333333305'::uuid, 'Ana Paula Mendes', 'Tomadora pessoa fisica', 'ana.mendes.demo@gkit.local', '(31) 98800-0505')
  ) as row(id, nome, descricao, email, celular)
)
insert into gkit_new.contatos (
  id,
  nome,
  descricao,
  email,
  celular,
  criado_por,
  atualizado_por
)
select
  contato_rows.id,
  contato_rows.nome,
  contato_rows.descricao,
  contato_rows.email,
  contato_rows.celular,
  actor.id,
  actor.id
from contato_rows
cross join actor
on conflict (id) do update
set
  nome = excluded.nome,
  descricao = excluded.descricao,
  email = excluded.email,
  celular = excluded.celular,
  atualizado_por = excluded.atualizado_por,
  atualizado_em = now();

insert into gkit_new.cliente_contatos (cliente_id, contato_id, papel, principal)
values
  ('22222222-2222-4222-8222-222222222201', '33333333-3333-4333-8333-333333333301', 'Sindica', true),
  ('22222222-2222-4222-8222-222222222201', '33333333-3333-4333-8333-333333333302', 'Conselheiro', false),
  ('22222222-2222-4222-8222-222222222202', '33333333-3333-4333-8333-333333333303', 'Administradora', true),
  ('22222222-2222-4222-8222-222222222203', '33333333-3333-4333-8333-333333333301', 'Indicadora', true),
  ('22222222-2222-4222-8222-222222222204', '33333333-3333-4333-8333-333333333304', 'Financeiro', true),
  ('22222222-2222-4222-8222-222222222205', '33333333-3333-4333-8333-333333333305', 'Principal', true)
on conflict (cliente_id, contato_id) do update
set
  papel = excluded.papel,
  principal = excluded.principal;

with actor as (
  select (
    select id
    from security.usuarios
    where status = 'ativo'
    order by nome nulls last, email nulls last, id
    limit 1
  ) as id
),
oportunidade_rows as (
  select *
  from (
    values
      (
        '44444444-4444-4444-8444-444444444401'::uuid,
        '22222222-2222-4222-8222-222222222201'::uuid,
        '33333333-3333-4333-8333-333333333301'::uuid,
        current_date - 18,
        'Implantacao Ciclo + Flex',
        'mensal',
        6800.00,
        'Implantacao do ciclo de vida do cliente, repasse financeiro e painel executivo.',
        'aprovada',
        'Demo: oportunidade aprovada antes do fim do workflow.'
      ),
      (
        '44444444-4444-4444-8444-444444444402'::uuid,
        '22222222-2222-4222-8222-222222222202'::uuid,
        '33333333-3333-4333-8333-333333333303'::uuid,
        current_date + 5,
        'Diagnostico comercial Alameda Prime',
        'mensal',
        4200.00,
        'Entrada consultiva para estruturar onboarding, documentos e regularidade.',
        'em_negociacao',
        null
      ),
      (
        '44444444-4444-4444-8444-444444444403'::uuid,
        '22222222-2222-4222-8222-222222222203'::uuid,
        '33333333-3333-4333-8333-333333333301'::uuid,
        current_date + 12,
        'Proposta inicial Jardim Norte',
        'pontual',
        12500.00,
        'Servico pontual de saneamento documental e preparacao de assembleia.',
        'proposta_enviada',
        null
      ),
      (
        '44444444-4444-4444-8444-444444444404'::uuid,
        '22222222-2222-4222-8222-222222222204'::uuid,
        '33333333-3333-4333-8333-333333333304'::uuid,
        current_date - 25,
        'Revisao de contrato Costa Sul',
        'pontual',
        8900.00,
        'Revisao juridica e financeira de contratos recorrentes.',
        'encerrada',
        'Demo: cliente adiou decisao para o proximo trimestre.'
      ),
      (
        '44444444-4444-4444-8444-444444444405'::uuid,
        '22222222-2222-4222-8222-222222222205'::uuid,
        '33333333-3333-4333-8333-333333333305'::uuid,
        current_date + 2,
        'Consulta pontual pessoa fisica',
        'pontual',
        1800.00,
        'Analise inicial e parecer objetivo para decisao da cliente.',
        'nova',
        null
      )
  ) as row(id, cliente_id, contato_id, data, descricao, tipo, valor, escopo, status, motivo)
)
insert into gkit_new.oportunidades (
  id,
  cliente_id,
  contato_id,
  data,
  descricao,
  tipo,
  valor,
  escopo,
  status,
  motivo_encerramento_antecipado,
  responsavel_id,
  criado_por,
  atualizado_por
)
select
  oportunidade_rows.id,
  oportunidade_rows.cliente_id,
  oportunidade_rows.contato_id,
  oportunidade_rows.data,
  oportunidade_rows.descricao,
  oportunidade_rows.tipo,
  oportunidade_rows.valor,
  oportunidade_rows.escopo,
  oportunidade_rows.status,
  oportunidade_rows.motivo,
  actor.id,
  actor.id,
  actor.id
from oportunidade_rows
cross join actor
on conflict (id) do update
set
  cliente_id = excluded.cliente_id,
  contato_id = excluded.contato_id,
  data = excluded.data,
  descricao = excluded.descricao,
  tipo = excluded.tipo,
  valor = excluded.valor,
  escopo = excluded.escopo,
  status = excluded.status,
  motivo_encerramento_antecipado = excluded.motivo_encerramento_antecipado,
  responsavel_id = excluded.responsavel_id,
  atualizado_por = excluded.atualizado_por,
  atualizado_em = now();

select gkit_new.criar_tarefas_oportunidade(id)
from (
  values
    ('44444444-4444-4444-8444-444444444401'::uuid),
    ('44444444-4444-4444-8444-444444444402'::uuid),
    ('44444444-4444-4444-8444-444444444403'::uuid),
    ('44444444-4444-4444-8444-444444444404'::uuid),
    ('44444444-4444-4444-8444-444444444405'::uuid)
) as oportunidade(id);

-- Mantem tarefas demo coerentes quando o script for reexecutado ou quando os prazos mudarem.
update gkit_new.tarefas tarefa
set
  descricao = modelo.descricao,
  data_prevista = oportunidade.criado_em::date + modelo.dias,
  responsavel_id = modelo.responsavel_id,
  atualizado_em = now()
from gkit_new.tarefa_modelos modelo,
  gkit_new.oportunidades oportunidade
where tarefa.modelo_id = modelo.id
  and oportunidade.id = tarefa.oportunidade_id
  and tarefa.oportunidade_id in (
    '44444444-4444-4444-8444-444444444401',
    '44444444-4444-4444-8444-444444444402',
    '44444444-4444-4444-8444-444444444403',
    '44444444-4444-4444-8444-444444444404',
    '44444444-4444-4444-8444-444444444405'
  );

update gkit_new.tarefas
set
  status = 'pendente',
  concluida_em = null,
  atualizado_em = now()
where oportunidade_id in (
    '44444444-4444-4444-8444-444444444401',
    '44444444-4444-4444-8444-444444444402',
    '44444444-4444-4444-8444-444444444403',
    '44444444-4444-4444-8444-444444444404',
    '44444444-4444-4444-8444-444444444405'
  );

update gkit_new.tarefas
set
  status = 'cancelada',
  atualizado_em = now()
where oportunidade_id in (
    '44444444-4444-4444-8444-444444444401',
    '44444444-4444-4444-8444-444444444404'
  )
  and status = 'pendente';

with actor as (
  select (
    select id
    from security.usuarios
    where status = 'ativo'
    order by nome nulls last, email nulls last, id
    limit 1
  ) as id
)
insert into gkit_new.eventos (id, entidade, entidade_id, usuario_id, tipo, descricao, metadata)
values
  (
    '55555555-5555-4555-8555-555555555502',
    'oportunidade',
    '44444444-4444-4444-8444-444444444401',
    (select id from actor),
    'workflow_cancelado',
    'Demo: oportunidade aprovada antes do fim do workflow.',
    jsonb_build_object('tarefas_canceladas', 5, 'demo', true)
  ),
  (
    '55555555-5555-4555-8555-555555555503',
    'oportunidade',
    '44444444-4444-4444-8444-444444444404',
    (select id from actor),
    'workflow_cancelado',
    'Demo: cliente adiou decisao para o proximo trimestre.',
    jsonb_build_object('tarefas_canceladas', 5, 'demo', true)
  )
on conflict (id) do update
set
  usuario_id = excluded.usuario_id,
  descricao = excluded.descricao,
  metadata = excluded.metadata,
  criado_em = now();

with actor as (
  select (
    select id
    from security.usuarios
    where status = 'ativo'
    order by nome nulls last, email nulls last, id
    limit 1
  ) as id
)
insert into gkit_new.eventos (id, entidade, entidade_id, usuario_id, tipo, descricao, metadata)
values
  ('55555555-5555-4555-8555-555555555501', 'demo', null, (select id from actor), 'demo_carregado', 'Dados demo do GKIT New carregados.', '{"script":"27_gkit_new_demo.sql"}'::jsonb)
on conflict (id) do update
set
  usuario_id = excluded.usuario_id,
  descricao = excluded.descricao,
  metadata = excluded.metadata,
  criado_em = now();

commit;
