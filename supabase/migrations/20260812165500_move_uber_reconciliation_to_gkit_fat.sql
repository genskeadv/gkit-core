begin;

with rows(codigo, nome, descricao, app_codigo, recurso, acao, sistema, status) as (
  values
    ('gkit_fat.uber.read', 'GKIT FAT - ler Uber', 'Consultar relatorios, lancamentos e pendencias de Uber.', 'gkit_fat', 'gkit_fat.uber', 'read', true, 'ativo'),
    ('gkit_fat.uber.write', 'GKIT FAT - conciliar Uber', 'Importar relatorios e atualizar status de reembolso Uber.', 'gkit_fat', 'gkit_fat.uber', 'write', true, 'ativo')
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

with grants(perfil_codigo, permissao_codigo) as (
  values
    ('admin_global', 'gkit_fat.uber.read'),
    ('admin_global', 'gkit_fat.uber.write'),
    ('gestor', 'gkit_fat.uber.read'),
    ('gestor', 'gkit_fat.uber.write'),
    ('operador', 'gkit_fat.uber.read'),
    ('operador', 'gkit_fat.uber.write'),
    ('visualizador', 'gkit_fat.uber.read')
)
insert into security.perfil_permissoes (perfil_id, permissao_id)
select perfis.id, permissoes.id
from grants
join security.perfis perfis
  on perfis.codigo = grants.perfil_codigo
  and perfis.status = 'ativo'
join security.permissoes permissoes
  on permissoes.codigo = grants.permissao_codigo
  and permissoes.status = 'ativo'
on conflict (perfil_id, permissao_id) do nothing;

drop policy if exists colab_uber_despesas_read_scope on public.colab_uber_despesas;
create policy colab_uber_despesas_read_scope
  on public.colab_uber_despesas
  for select
  to authenticated
  using (
    colaborador_usuario_id = (select auth.uid())
    or security.usuario_tem_permissao('gkit_fat.uber.read')
    or security.usuario_tem_permissao('gkit_fat.uber.write')
    or security.usuario_tem_permissao('gkit_flex.uber.read')
    or security.usuario_tem_permissao('gkit_flex.uber.write')
  );

drop policy if exists colab_uber_despesas_update_flex on public.colab_uber_despesas;
create policy colab_uber_despesas_update_fat
  on public.colab_uber_despesas
  for update
  to authenticated
  using (
    security.usuario_tem_permissao('gkit_fat.uber.write')
    or security.usuario_tem_permissao('gkit_flex.uber.write')
  )
  with check (
    security.usuario_tem_permissao('gkit_fat.uber.write')
    or security.usuario_tem_permissao('gkit_flex.uber.write')
  );

drop policy if exists colab_uber_relatorios_read_flex on public.colab_uber_relatorios;
create policy colab_uber_relatorios_read_fat
  on public.colab_uber_relatorios
  for select
  to authenticated
  using (
    security.usuario_tem_permissao('gkit_fat.uber.read')
    or security.usuario_tem_permissao('gkit_fat.uber.write')
    or security.usuario_tem_permissao('gkit_flex.uber.read')
    or security.usuario_tem_permissao('gkit_flex.uber.write')
  );

drop policy if exists colab_uber_relatorio_corridas_read_flex on public.colab_uber_relatorio_corridas;
create policy colab_uber_relatorio_corridas_read_fat
  on public.colab_uber_relatorio_corridas
  for select
  to authenticated
  using (
    security.usuario_tem_permissao('gkit_fat.uber.read')
    or security.usuario_tem_permissao('gkit_fat.uber.write')
    or security.usuario_tem_permissao('gkit_flex.uber.read')
    or security.usuario_tem_permissao('gkit_flex.uber.write')
  );

drop policy if exists colab_uber_recibos_own_select on storage.objects;
create policy colab_uber_recibos_own_select
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'colab-uber-recibos'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or security.usuario_tem_permissao('gkit_fat.uber.read')
      or security.usuario_tem_permissao('gkit_fat.uber.write')
      or security.usuario_tem_permissao('gkit_flex.uber.read')
      or security.usuario_tem_permissao('gkit_flex.uber.write')
    )
  );

commit;
