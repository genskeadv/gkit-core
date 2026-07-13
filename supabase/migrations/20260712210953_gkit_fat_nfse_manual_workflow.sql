begin;

create table if not exists gkit_fat.empresas_emissoras (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  razao_social text,
  cnpj text,
  inscricao_municipal text,
  municipio text,
  codigo_municipio_ibge text,
  regime_tributario text,
  regime_especial_tributacao text,
  ambiente text not null default 'homologacao'
    check (ambiente in ('homologacao', 'producao')),
  serie_rps text,
  proximo_numero_rps integer check (proximo_numero_rps is null or proximo_numero_rps > 0),
  aliquota_iss numeric(7,4) check (aliquota_iss is null or aliquota_iss >= 0),
  iss_retido_padrao boolean not null default false,
  certificado_alias text,
  certificado_validade date,
  observacoes text,
  metadata jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  criado_por uuid references security.usuarios(id) on delete set null,
  atualizado_por uuid references security.usuarios(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table gkit_fat.ordens_servico
  add column if not exists empresa_emissora_id uuid references gkit_fat.empresas_emissoras(id) on delete set null,
  add column if not exists numero_rps text,
  add column if not exists serie_rps text,
  add column if not exists numero_nfse text,
  add column if not exists codigo_verificacao text,
  add column if not exists nfse_url text,
  add column if not exists xml_url text,
  add column if not exists pdf_url text,
  add column if not exists data_emissao timestamptz,
  add column if not exists data_autorizacao timestamptz,
  add column if not exists data_cancelamento timestamptz,
  add column if not exists motivo_rejeicao text,
  add column if not exists motivo_cancelamento text,
  add column if not exists validacao_fiscal jsonb not null default '{}'::jsonb;

create table if not exists gkit_fat.nfse_eventos (
  id uuid primary key default gen_random_uuid(),
  ordem_servico_id uuid not null references gkit_fat.ordens_servico(id) on delete cascade,
  tipo_evento text not null
    check (tipo_evento in ('pre_nota', 'manual_pendente', 'autorizada', 'rejeitada', 'cancelada', 'substituida', 'observacao')),
  status_fiscal_anterior text,
  status_fiscal_novo text,
  payload jsonb not null default '{}'::jsonb,
  observacoes text,
  criado_por uuid references security.usuarios(id) on delete set null,
  criado_em timestamptz not null default now()
);

create index if not exists idx_gkit_fat_empresas_ativas
  on gkit_fat.empresas_emissoras(ativo, ambiente);

create index if not exists idx_gkit_fat_ordens_empresa_emissora
  on gkit_fat.ordens_servico(empresa_emissora_id);

create index if not exists idx_gkit_fat_nfse_eventos_ordem
  on gkit_fat.nfse_eventos(ordem_servico_id, criado_em desc);

drop trigger if exists set_updated_at_empresas_emissoras on gkit_fat.empresas_emissoras;
create trigger set_updated_at_empresas_emissoras
before update on gkit_fat.empresas_emissoras
for each row execute function gkit_fat.set_updated_at();

alter table gkit_fat.empresas_emissoras enable row level security;
alter table gkit_fat.nfse_eventos enable row level security;

grant select on gkit_fat.empresas_emissoras, gkit_fat.nfse_eventos to authenticated;
grant select, insert, update, delete on gkit_fat.empresas_emissoras, gkit_fat.nfse_eventos to service_role;

drop policy if exists empresas_emissoras_read_scope on gkit_fat.empresas_emissoras;
create policy empresas_emissoras_read_scope
on gkit_fat.empresas_emissoras
for select
to authenticated
using (
  security.usuario_tem_permissao('gkit_fat.configuracoes.read')
  or security.usuario_tem_permissao('gkit_fat.nfse.read')
  or security.usuario_tem_permissao('gkit_fat.faturas.read')
);

drop policy if exists nfse_eventos_read_scope on gkit_fat.nfse_eventos;
create policy nfse_eventos_read_scope
on gkit_fat.nfse_eventos
for select
to authenticated
using (
  security.usuario_tem_permissao('gkit_fat.nfse.read')
  or security.usuario_tem_permissao('gkit_fat.faturas.read')
);

insert into gkit_fat.empresas_emissoras (nome, razao_social, ambiente, observacoes)
select 'Genske Advogados', 'Genske Advogados', 'homologacao', 'Cadastro inicial para conferencia fiscal. Completar CNPJ, IM, municipio e certificado antes da emissao automatica.'
where not exists (select 1 from gkit_fat.empresas_emissoras);

with rows(codigo, nome, descricao, recurso, acao, sistema, status) as (
  values
    ('gkit_fat.nfse.read', 'GKIT FAT - ler NFS-e', 'Consultar pre-notas, payloads e retornos de NFS-e.', 'gkit_fat.nfse', 'read', true, 'ativo'),
    ('gkit_fat.nfse.write', 'GKIT FAT - gravar NFS-e', 'Conferir pre-notas e registrar emissoes ou rejeicoes de NFS-e.', 'gkit_fat.nfse', 'write', true, 'ativo')
)
insert into security.permissoes (codigo, nome, descricao, app_id, recurso, acao, sistema, status)
select rows.codigo, rows.nome, rows.descricao, apps.id, rows.recurso, rows.acao, rows.sistema, rows.status::core.status_registro
from rows
left join core.apps apps on apps.codigo = 'gkit_fat'
on conflict (codigo) do update
set
  nome = excluded.nome,
  descricao = excluded.descricao,
  app_id = excluded.app_id,
  recurso = excluded.recurso,
  acao = excluded.acao,
  sistema = excluded.sistema,
  status = excluded.status;

with grants(perfil_codigo, permissao_codigo) as (
  values
    ('admin_global', 'gkit_fat.nfse.read'),
    ('admin_global', 'gkit_fat.nfse.write'),
    ('gestor', 'gkit_fat.nfse.read'),
    ('gestor', 'gkit_fat.nfse.write'),
    ('operador', 'gkit_fat.nfse.read'),
    ('operador', 'gkit_fat.nfse.write'),
    ('visualizador', 'gkit_fat.nfse.read')
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

notify pgrst, 'reload schema';

commit;
