-- Keep PostgREST schema cache aligned with the active physical schemas.
-- Retired schemas (crm, gkli_intr, flex) were dropped, but were still listed
-- in pgrst.db_schemas, causing PGRST002 and breaking server-side auth guards.
alter role authenticator set pgrst.db_schemas =
  'public, graphql_public, audit, core, security, ciclo, gkit_new, gkit_ate, gkit_performa';

notify pgrst, 'reload config';
notify pgrst, 'reload schema';
