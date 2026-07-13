begin;

update core.apps
set
  nome = 'GKIT Ciclo',
  url_path = '/modulos/gkit-ciclo',
  updated_at = now()
where codigo = 'ciclo';

commit;
