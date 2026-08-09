begin;

alter table public.gkit_flex_previsao_pagamentos
  add column if not exists money_conta_id uuid null references public.gkit_money_contas(id) on delete set null;

alter table public.gkit_flex_previsao_pagamentos
  add column if not exists money_conta_destino_id uuid null references public.gkit_money_contas(id) on delete set null;

create index if not exists idx_gkit_flex_previsao_pagamentos_money_conta
  on public.gkit_flex_previsao_pagamentos (money_conta_id);

create index if not exists idx_gkit_flex_previsao_pagamentos_money_destino
  on public.gkit_flex_previsao_pagamentos (money_conta_destino_id);

commit;
