-- Retired INTR/FIX routines left behind after module deactivation.
-- They reference removed/inconsistent objects and fail schema linting.

drop function if exists gkli_intr.fix_gerar_previsao_mensal(date);
drop function if exists gkli_intr.fix_gerar_despesas_recorrentes_por_historico(date, integer);
drop function if exists public.gkli_intr_importar_receitas(text, jsonb);

notify pgrst, 'reload schema';
