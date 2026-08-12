begin;

insert into core.apps (codigo, nome, descricao, status, url_path, ordem)
values (
  'uber',
  'GKIT Uber',
  'Lancamento e acompanhamento de despesas de Uber sem depender do Colab.',
  'ativo',
  '/modulos/uber',
  45
)
on conflict (codigo) do update
set
  nome = excluded.nome,
  descricao = excluded.descricao,
  status = excluded.status,
  url_path = excluded.url_path,
  ordem = excluded.ordem,
  updated_at = now();

with rows(codigo, nome, descricao, app_codigo, recurso, acao, sistema, status) as (
  values
    ('uber.read', 'GKIT Uber - ler despesas', 'Consultar despesas de Uber do usuario.', 'uber', 'uber', 'read', true, 'ativo'),
    ('uber.write', 'GKIT Uber - lancar despesas', 'Lancar despesas de Uber com recibo para reembolso.', 'uber', 'uber', 'write', true, 'ativo')
)
insert into security.permissoes (codigo, nome, descricao, app_id, recurso, acao, sistema, status)
select rows.codigo, rows.nome, rows.descricao, apps.id, rows.recurso, rows.acao, rows.sistema, rows.status::core.status_registro
from rows
join core.apps apps on apps.codigo = rows.app_codigo
on conflict (codigo) do update
set
  nome = excluded.nome,
  descricao = excluded.descricao,
  app_id = excluded.app_id,
  recurso = excluded.recurso,
  acao = excluded.acao,
  sistema = excluded.sistema,
  status = excluded.status,
  updated_at = now();

insert into security.perfil_permissoes (perfil_id, permissao_id)
select perfil.id, permissao.id
from security.perfis perfil
cross join security.permissoes permissao
where perfil.codigo = 'admin_global'
  and permissao.codigo in ('uber.read', 'uber.write')
on conflict (perfil_id, permissao_id) do nothing;

drop policy if exists colab_uber_despesas_insert_own on public.colab_uber_despesas;
create policy colab_uber_despesas_insert_own
  on public.colab_uber_despesas
  for insert
  to authenticated
  with check (
    colaborador_usuario_id = (select auth.uid())
    and (
      security.usuario_tem_permissao('uber.write')
      or security.usuario_tem_permissao('colab.uber.write')
    )
  );

drop policy if exists colab_uber_recibos_own_insert on storage.objects;
create policy colab_uber_recibos_own_insert
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'colab-uber-recibos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (
      security.usuario_tem_permissao('uber.write')
      or security.usuario_tem_permissao('colab.uber.write')
    )
  );

commit;
