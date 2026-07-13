alter table gkit_jur.acordos_judiciais
  add column if not exists email_lembrete text,
  add column if not exists lembretes_pagamento_ativos boolean not null default true,
  add column if not exists lembrete_dias integer[] not null default array[-5, -1, 0, 3, 7];

alter table gkit_jur.acordos_judiciais
  drop constraint if exists gkit_jur_acordos_lembrete_dias_range;

alter table gkit_jur.acordos_judiciais
  add constraint gkit_jur_acordos_lembrete_dias_range
  check (
    array_length(lembrete_dias, 1) is not null
    and array_length(lembrete_dias, 1) <= 12
  );

create table if not exists gkit_jur.acordo_lembretes_email (
  id uuid primary key default gen_random_uuid(),
  acordo_id uuid not null references gkit_jur.acordos_judiciais(id) on delete cascade,
  parcela_id uuid not null references gkit_jur.acordo_parcelas(id) on delete cascade,
  dias_referencia integer not null check (dias_referencia between -30 and 60),
  tipo text not null check (tipo in ('antes_vencimento', 'no_vencimento', 'apos_vencimento')),
  agendado_para date not null,
  destinatario_email text,
  assunto text,
  corpo text,
  status text not null default 'pendente' check (status in ('pendente', 'enviado', 'cancelado', 'erro')),
  enviado_em timestamptz,
  enviado_por uuid references security.usuarios(id) on delete set null,
  erro_mensagem text,
  criado_por uuid references security.usuarios(id) on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint gkit_jur_acordo_lembretes_unique unique (parcela_id, dias_referencia)
);

create index if not exists idx_gkit_jur_acordo_lembretes_status_agenda
  on gkit_jur.acordo_lembretes_email(status, agendado_para);

create index if not exists idx_gkit_jur_acordo_lembretes_acordo
  on gkit_jur.acordo_lembretes_email(acordo_id, agendado_para);

create index if not exists idx_gkit_jur_acordo_lembretes_parcela
  on gkit_jur.acordo_lembretes_email(parcela_id, agendado_para);

insert into gkit_jur.acordo_lembretes_email (
  acordo_id,
  parcela_id,
  dias_referencia,
  tipo,
  agendado_para,
  destinatario_email,
  assunto,
  corpo
)
select
  a.id,
  p.id,
  dias.dia,
  case
    when dias.dia < 0 then 'antes_vencimento'
    when dias.dia = 0 then 'no_vencimento'
    else 'apos_vencimento'
  end,
  p.vencimento + dias.dia,
  a.email_lembrete,
  'Lembrete de pagamento do acordo judicial',
  concat(
    'Prezado(a), lembramos o pagamento da parcela ',
    p.numero,
    ' do acordo judicial, no valor de R$ ',
    to_char(p.valor, 'FM999G999G999G990D00'),
    ', com vencimento em ',
    to_char(p.vencimento, 'DD/MM/YYYY'),
    '.'
  )
from gkit_jur.acordos_judiciais a
join gkit_jur.acordo_parcelas p on p.acordo_id = a.id
cross join lateral unnest(a.lembrete_dias) as dias(dia)
where a.status = 'ativo'
  and p.status = 'pendente'
on conflict (parcela_id, dias_referencia) do nothing;

alter table gkit_jur.acordo_lembretes_email enable row level security;

drop policy if exists acordo_lembretes_email_read_scope on gkit_jur.acordo_lembretes_email;
create policy acordo_lembretes_email_read_scope on gkit_jur.acordo_lembretes_email
  for select to authenticated
  using (
    exists (
      select 1
      from gkit_jur.acordos_judiciais a
      join gkit_jur.processos p on p.id = a.processo_id
      where a.id = acordo_lembretes_email.acordo_id
        and (
          (select security.is_admin_global())
          or (
            security.usuario_tem_permissao('gkit_jur.processos.read')
            and (p.carteira_id is null or security.usuario_tem_carteira(p.carteira_id))
          )
        )
    )
  );

drop policy if exists acordo_lembretes_email_write_scope on gkit_jur.acordo_lembretes_email;
create policy acordo_lembretes_email_write_scope on gkit_jur.acordo_lembretes_email
  for all to authenticated
  using (
    exists (
      select 1
      from gkit_jur.acordos_judiciais a
      join gkit_jur.processos p on p.id = a.processo_id
      where a.id = acordo_lembretes_email.acordo_id
        and (
          (select security.is_admin_global())
          or (
            security.usuario_tem_permissao('gkit_jur.processos.write')
            and (p.carteira_id is null or security.usuario_tem_carteira(p.carteira_id))
          )
        )
    )
  )
  with check (
    exists (
      select 1
      from gkit_jur.acordos_judiciais a
      join gkit_jur.processos p on p.id = a.processo_id
      where a.id = acordo_lembretes_email.acordo_id
        and (
          (select security.is_admin_global())
          or (
            security.usuario_tem_permissao('gkit_jur.processos.write')
            and (p.carteira_id is null or security.usuario_tem_carteira(p.carteira_id))
          )
        )
    )
  );

grant select, insert, update, delete on gkit_jur.acordo_lembretes_email to authenticated;
grant select, insert, update, delete on gkit_jur.acordo_lembretes_email to service_role;

comment on column gkit_jur.acordos_judiciais.email_lembrete is 'E-mail destinatario dos lembretes de pagamento do acordo judicial.';
comment on column gkit_jur.acordos_judiciais.lembretes_pagamento_ativos is 'Indica se a regua de e-mails de pagamento esta ativa para o acordo judicial.';
comment on column gkit_jur.acordos_judiciais.lembrete_dias is 'Dias relativos ao vencimento da parcela para gerar lembretes. Valores negativos sao antes do vencimento.';
comment on table gkit_jur.acordo_lembretes_email is 'Agenda e historico de e-mails de lembrete de pagamento das parcelas de acordos judiciais.';
