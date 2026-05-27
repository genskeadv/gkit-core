-- GKLI Core - permissoes finas do Intr
-- Execute depois do bootstrap do Core.

insert into security.permissoes (
  codigo,
  nome,
  descricao,
  app_codigo,
  recurso,
  acao,
  padrao_sistema,
  status
)
values
  ('intr.colaboradores.read', 'Ver colaboradores Intr', 'Consultar colaboradores do GKLI Intr', 'intr', 'intr.colaboradores', 'read', true, 'ativo'),
  ('intr.colaboradores.write', 'Gerenciar colaboradores Intr', 'Criar e editar colaboradores do GKLI Intr', 'intr', 'intr.colaboradores', 'write', true, 'ativo'),
  ('intr.times.read', 'Ver times Intr', 'Consultar times do GKLI Intr', 'intr', 'intr.times', 'read', true, 'ativo'),
  ('intr.times.write', 'Gerenciar times Intr', 'Criar e editar times do GKLI Intr', 'intr', 'intr.times', 'write', true, 'ativo'),
  ('intr.receitas.read', 'Ver receitas Intr', 'Consultar receitas do GKLI Intr', 'intr', 'intr.receitas', 'read', true, 'ativo'),
  ('intr.receitas.write', 'Gerenciar receitas Intr', 'Criar e editar receitas do GKLI Intr', 'intr', 'intr.receitas', 'write', true, 'ativo'),
  ('intr.comissoes.read', 'Ver comissoes Intr', 'Consultar comissoes do GKLI Intr', 'intr', 'intr.comissoes', 'read', true, 'ativo'),
  ('intr.comissoes.write', 'Gerenciar comissoes Intr', 'Criar, editar e aprovar comissoes do GKLI Intr', 'intr', 'intr.comissoes', 'write', true, 'ativo'),
  ('intr.pagamentos.read', 'Ver pagamentos Intr', 'Consultar pagamentos do GKLI Intr', 'intr', 'intr.pagamentos', 'read', true, 'ativo'),
  ('intr.pagamentos.write', 'Gerenciar pagamentos Intr', 'Criar e editar pagamentos do GKLI Intr', 'intr', 'intr.pagamentos', 'write', true, 'ativo'),
  ('intr.agenda_pagamentos.read', 'Ver agenda de pagamentos', 'Consultar agenda de pagamentos do GKLI Intr', 'intr', 'intr.agenda_pagamentos', 'read', true, 'ativo'),
  ('intr.agenda_pagamentos.write', 'Gerenciar agenda de pagamentos', 'Criar, editar e gerar previstos da agenda de pagamentos', 'intr', 'intr.agenda_pagamentos', 'write', true, 'ativo'),
  ('intr.fechamentos.read', 'Ver fechamentos Intr', 'Consultar fechamentos mensais do GKLI Intr', 'intr', 'intr.fechamentos', 'read', true, 'ativo'),
  ('intr.fechamentos.write', 'Gerenciar fechamentos Intr', 'Recalcular e fechar competencias do GKLI Intr', 'intr', 'intr.fechamentos', 'write', true, 'ativo')
on conflict (codigo) do update set
  nome = excluded.nome,
  descricao = excluded.descricao,
  recurso = excluded.recurso,
  acao = excluded.acao,
  status = excluded.status;

insert into security.perfil_permissoes (perfil_id, permissao_id)
select p.id, pe.id
from security.perfis p
join security.permissoes pe on pe.codigo in (
  'intr.colaboradores.read',
  'intr.colaboradores.write',
  'intr.times.read',
  'intr.times.write',
  'intr.receitas.read',
  'intr.receitas.write',
  'intr.comissoes.read',
  'intr.comissoes.write',
  'intr.pagamentos.read',
  'intr.pagamentos.write',
  'intr.agenda_pagamentos.read',
  'intr.agenda_pagamentos.write',
  'intr.fechamentos.read',
  'intr.fechamentos.write'
)
where p.codigo in ('admin_global', 'admin_carteira', 'operador')
on conflict do nothing;

insert into security.perfil_permissoes (perfil_id, permissao_id)
select p.id, pe.id
from security.perfis p
join security.permissoes pe on pe.codigo in (
  'intr.colaboradores.read',
  'intr.times.read',
  'intr.receitas.read',
  'intr.comissoes.read',
  'intr.pagamentos.read',
  'intr.agenda_pagamentos.read',
  'intr.fechamentos.read'
)
where p.codigo in ('gestor', 'visualizador')
on conflict do nothing;
