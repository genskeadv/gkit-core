-- Flex Sprint 7 - importador de receitas Omie XLSX.

create unique index if not exists ux_flex_receitas_origem_chave
  on flex.receitas(origem_chave)
  where origem_chave is not null;

create index if not exists idx_flex_receitas_origem
  on flex.receitas(origem);

grant usage on schema flex to authenticated, service_role;
grant select, insert, update, delete on flex.importacoes to authenticated, service_role;
grant select, insert, update, delete on flex.receitas to authenticated, service_role;

comment on index flex.ux_flex_receitas_origem_chave is 'Evita duplicidade na reimportacao de receitas Omie.';
