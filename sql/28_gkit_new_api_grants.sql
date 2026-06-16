-- GKIT New - reparo de grants para API Supabase/PostgREST.
-- Use quando o schema gkit_new ja estiver em Exposed schemas,
-- mas a API retornar: permission denied for schema gkit_new.

begin;

grant usage on schema gkit_new to anon, authenticated, service_role;

grant select on all tables in schema gkit_new to anon, authenticated;
grant select, insert, update, delete on all tables in schema gkit_new to service_role;

grant usage, select on all sequences in schema gkit_new to anon, authenticated, service_role;

grant execute on all functions in schema gkit_new to service_role;

alter default privileges in schema gkit_new
  grant select on tables to anon, authenticated;

alter default privileges in schema gkit_new
  grant select, insert, update, delete on tables to service_role;

alter default privileges in schema gkit_new
  grant usage, select on sequences to anon, authenticated, service_role;

alter default privileges in schema gkit_new
  grant execute on functions to service_role;

commit;
