-- GKLI Flex - limpeza do legado financeiro anterior
--
-- IMPORTANTE:
-- Este script e destrutivo. Nao rode sem backup validado.
-- Por padrao, ele aborta. Para executar, rode na mesma sessao:
--
--   set app.confirm_flex_legacy_cleanup = 'yes';
--
-- Depois rode este arquivo inteiro.
--
-- O script remove objetos conhecidos do legado financeiro anterior e desativa
-- apps antigos no Core. Ele nao toca no schema `flex`.

begin;

do $$
begin
  if current_setting('app.confirm_flex_legacy_cleanup', true) is distinct from 'yes' then
    raise exception 'Limpeza abortada. Rode: set app.confirm_flex_legacy_cleanup = ''yes'';';
  end if;
end $$;

-- Desativa entradas antigas no Core sem apagar historico de acesso.
update core.apps
set status = 'inativo'
where codigo in ('intr', 'fix');

update security.usuario_app_acessos
set ativo = false
where app_id in (
  select id
  from core.apps
  where codigo in ('intr', 'fix')
);

-- Desativa permissoes antigas, preservando historico de cadastro.
update security.permissoes
set status = 'inativo'
where codigo like 'intr.%'
   or codigo like 'fix.%';

-- Remove views/resumos conhecidos do legado. `cascade` e usado porque views
-- podem depender umas das outras.
drop view if exists public.gkli_intr_pagamentos_resumo cascade;
drop view if exists public.gkli_intr_comissoes_resumo cascade;
drop view if exists public.gkli_intr_fix_extrato_lancamentos_resumo cascade;
drop view if exists public.gkli_intr_fix_despesas_realizadas_resumo cascade;
drop view if exists public.gkli_intr_fix_despesas_recorrentes_resumo cascade;
drop view if exists public.gkli_intr_fix_orcamento_despesas_resumo cascade;
drop view if exists public.gkli_intr_fix_validacao_despesas_resumo cascade;
drop view if exists public.gkit_fix_comissoes_aprovacao_resumo cascade;
drop view if exists public.gkit_fix_fechamento_checklist_resumo cascade;

-- Remove schemas legados se existirem.
drop schema if exists gkli_intr cascade;
drop schema if exists intr cascade;
drop schema if exists fix cascade;

-- Relatorio final da limpeza.
do $$
begin
  raise notice 'Limpeza concluida. Verifique dependencias do Colab antes de publicar em producao.';
end $$;

commit;
