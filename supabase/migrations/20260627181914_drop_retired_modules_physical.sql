-- Physically remove retired modules with no real production data.
-- Preserves the new canonical modules such as gkit_new, gkit_flex and gkit_performa.

do $$
declare
  retired_codes text[] := array['crm', 'din', 'fix', 'flex', 'intr'];
begin
  delete from security.usuario_app_acessos uaa
  using core.apps a
  where uaa.app_id = a.id
    and a.codigo = any(retired_codes);

  delete from security.perfil_permissoes pp
  using security.permissoes p
  where pp.permissao_id = p.id
    and (
      split_part(p.codigo, '.', 1) = any(retired_codes)
      or p.codigo in ('crm', 'din', 'fix', 'flex', 'intr')
    );

  delete from security.permissoes p
  where split_part(p.codigo, '.', 1) = any(retired_codes)
     or p.codigo in ('crm', 'din', 'fix', 'flex', 'intr');

  delete from core.apps
  where codigo = any(retired_codes);
end $$;

drop function if exists public.gkli_intr_normalizar_texto(text);
drop function if exists public.gkli_intr_upsert_time(uuid, text, text, boolean);

drop schema if exists crm cascade;
drop schema if exists flex cascade;
drop schema if exists gkli_intr cascade;

notify pgrst, 'reload schema';
