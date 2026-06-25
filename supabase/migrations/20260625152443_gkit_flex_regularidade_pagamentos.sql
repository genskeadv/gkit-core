alter table if exists ciclo.regularidade_cliente
  add column if not exists percentual_pagamentos integer,
  add column if not exists status_pagamentos text,
  add column if not exists pendencias_pagamentos jsonb not null default '[]'::jsonb,
  add column if not exists origem_pagamentos text,
  add column if not exists atualizado_pagamentos_em timestamptz;

comment on column ciclo.regularidade_cliente.percentual_pagamentos is
  'Pontualidade financeira calculada pelo GKIT Flex a partir das comissoes pagas.';

comment on column ciclo.regularidade_cliente.status_pagamentos is
  'Status financeiro derivado da pontualidade: saudavel, atencao ou critico.';

comment on column ciclo.regularidade_cliente.pendencias_pagamentos is
  'Pendencias financeiras identificadas pelo GKIT Flex para o cliente.';

comment on column ciclo.regularidade_cliente.origem_pagamentos is
  'Origem do ultimo calculo financeiro de regularidade.';

comment on column ciclo.regularidade_cliente.atualizado_pagamentos_em is
  'Data/hora do ultimo retorno de regularidade financeira do GKIT Flex.';
