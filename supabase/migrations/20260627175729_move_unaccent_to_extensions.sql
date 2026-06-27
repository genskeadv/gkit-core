-- Keep extensions out of public and qualify application calls explicitly.

create schema if not exists extensions;

alter extension unaccent set schema extensions;

grant usage on schema extensions to anon, authenticated, service_role;

create or replace function gkit_ate.normalizar_slug(value text)
returns text
language sql
immutable
set search_path = gkit_ate, extensions, pg_temp
as $$
  select trim(both '-' from regexp_replace(
    lower(extensions.unaccent(coalesce(value, ''))),
    '[^a-z0-9]+',
    '-',
    'g'
  ));
$$;

create or replace function public.gkli_intr_normalizar_texto(p_texto text)
returns text
language sql
immutable
set search_path = public, extensions, pg_temp
as $$
  select lower(regexp_replace(extensions.unaccent(coalesce(trim(p_texto), '')), '\s+', ' ', 'g'));
$$;

notify pgrst, 'reload schema';
