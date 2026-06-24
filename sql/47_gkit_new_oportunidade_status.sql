-- GKIT New - status de acompanhamento de propostas.

alter table gkit_new.oportunidades
  drop constraint if exists oportunidades_status_check;

alter table gkit_new.oportunidades
  add constraint oportunidades_status_check
  check (
    status in (
      'nova',
      'proposta_enviada',
      'em_negociacao',
      'aprovada',
      'rejeitada',
      'cancelada',
      'encerrada'
    )
  );
