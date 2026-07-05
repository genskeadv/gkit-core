begin;

insert into gkit_jur.movimentacao_tarefa_regras (
  nome,
  descricao,
  codigo_movimento,
  termos,
  tipo_tarefa,
  prioridade,
  titulo_template,
  descricao_template,
  prazo_dias,
  gerar_automaticamente,
  ativo
)
values (
  'Encerramento por transito em julgado',
  'Gera tarefa de revisao quando a movimentacao indicar transito em julgado ou arquivamento.',
  null,
  '["transito em julgado", "trânsito em julgado", "arquivado definitivamente", "arquivamento definitivo", "arquivado provisoriamente", "arquivamento provisorio", "arquivamento provisório"]'::jsonb,
  'revisao',
  'alta',
  'Analisar encerramento do processo',
  'Movimentacao DataJud: {{movimentacao}}. Sugestao: validar baixa operacional e alterar o status do processo para Encerrado, pausando o monitoramento se cabivel.',
  1,
  true,
  true
)
on conflict ((lower(nome))) do update
set
  descricao = excluded.descricao,
  codigo_movimento = excluded.codigo_movimento,
  termos = excluded.termos,
  tipo_tarefa = excluded.tipo_tarefa,
  prioridade = excluded.prioridade,
  titulo_template = excluded.titulo_template,
  descricao_template = excluded.descricao_template,
  prazo_dias = excluded.prazo_dias,
  gerar_automaticamente = excluded.gerar_automaticamente,
  ativo = excluded.ativo,
  updated_at = now();

notify pgrst, 'reload schema';

commit;
