import Link from 'next/link'
import type { ReactNode } from 'react'
import { ModuleShell, type ModuleNavGroup } from '@/features/shared/module-shell'
import { OperationalKpiGrid, OperationalQuickLinks } from '@/features/shared/operational-ui'
import type { PlatformUsuario } from '@/lib/auth/platform'
import { statusLabel, tone } from '@/features/gkit-fat/queries'
import type { GkitFatContrato, GkitFatDashboardData, GkitFatEmpresaEmissora, GkitFatFormData, GkitFatHealth, GkitFatOrdemServico, GkitFatOrdemServicoDetail } from '@/features/gkit-fat/types'

type GkitFatTab = 'cockpit' | 'contratos' | 'faturas' | 'configuracoes'

const activeHref: Record<GkitFatTab, string> = {
  cockpit: '/modulos/gkit-fat',
  contratos: '/modulos/gkit-fat/contratos',
  faturas: '/modulos/gkit-fat/faturas',
  configuracoes: '/modulos/gkit-fat/configuracoes',
}

const navGroups: ModuleNavGroup[] = [
  { href: '/modulos/gkit-fat', title: 'Cockpit' },
  { href: '/modulos/gkit-fat/contratos', title: 'Contratos' },
  { href: '/modulos/gkit-fat/faturas', title: 'OS e Faturas' },
  { href: '/modulos/gkit-fat/configuracoes', title: 'Configuracoes' },
]

export function GkitFatShell({
  active,
  actions,
  children,
  description,
  title,
  usuario,
}: {
  active: GkitFatTab
  actions?: ReactNode
  children: ReactNode
  description: string
  title: string
  usuario: PlatformUsuario
}) {
  return (
    <ModuleShell
      activeHref={activeHref[active]}
      actions={actions}
      brand="Faturamento"
      description={description}
      eyebrow="GKIT FAT"
      navGroups={navGroups}
      product="GKIT FAT"
      title={title}
      usuario={usuario}
      variantClassName="gkit-fat-shell"
    >
      {children}
    </ModuleShell>
  )
}

export function GkitFatSection({
  action,
  children,
  className,
  description,
  title,
}: {
  action?: ReactNode
  children: ReactNode
  className?: string
  description?: string
  title: string
}) {
  return (
    <section className={className ? `suite-panel ${className}` : 'suite-panel'}>
      <div className="suite-panel-heading">
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export function GkitFatHealthNotice({ health }: { health: GkitFatHealth }) {
  if (health.ok) return null

  return (
    <div className="suite-empty-block danger">
      <strong>{health.title}</strong>
      <span>{health.message}</span>
      {health.detail ? <small>{health.detail}</small> : null}
    </div>
  )
}

export function GkitFatDashboard({ data }: { data: GkitFatDashboardData }) {
  return (
    <>
      <GkitFatSection
        className="gkit-fat-command-panel"
        description="Escolha a etapa para operar contratos, OS, conferencia fiscal e emissao."
        title="Ordem do fluxo"
      >
        <div className="gkit-fat-command-grid">
          <OperationalQuickLinks classPrefix="gkit-fat" defaultLabel="Fluxo" items={data.quickLinks} />
          <OperationalKpiGrid className="suite-kpi-grid compact" items={data.cards} />
        </div>
      </GkitFatSection>
      <GkitFatSection
        action={<Link className="button secondary" href="/modulos/gkit-fat/contratos">Ver contratos</Link>}
        description="Base de faturamento para mensalidade, pontual e cobranca."
        title="Contratos recentes"
      >
        <GkitFatContratosList canWrite={false} contratos={data.contratosRecentes} empty="Nenhum contrato cadastrado ainda." />
      </GkitFatSection>
      <GkitFatSection
        action={<Link className="button secondary" href="/modulos/gkit-fat/faturas">Ver OS</Link>}
        description="Ordens de servico geradas com snapshot para NFS-e 03220."
        title="OS recentes"
      >
        <GkitFatOrdensList empty="Nenhuma OS gerada ainda." ordens={data.ordensRecentes} />
      </GkitFatSection>
    </>
  )
}

export function GkitFatContratosList({
  canWrite,
  contratos,
  empty,
}: {
  canWrite: boolean
  contratos: GkitFatContrato[]
  empty: string
}) {
  if (!contratos.length) return <div className="suite-empty-block">{empty}</div>

  return (
    <div className="suite-table-list compact" role="list">
      {contratos.map((contrato) => (
        <article key={contrato.id} role="listitem">
          <div>
            <h3>{contrato.cliente_nome}</h3>
            <p>{contrato.numero} - {contrato.descricao_servico}</p>
          </div>
          <span className={`suite-pill ${tone(contrato.status)}`}>{statusLabel(contrato.status)}</span>
          <strong>{contrato.valor_label}</strong>
          <small>{contrato.tipo_faturamento} - {contrato.carteira_nome ?? 'Sem carteira'}</small>
          {canWrite ? <Link className="button secondary" href={`/modulos/gkit-fat/contratos/${contrato.id}`}>Editar</Link> : null}
        </article>
      ))}
    </div>
  )
}

export function GkitFatOrdensList({
  empty,
  ordens,
}: {
  empty: string
  ordens: GkitFatOrdemServico[]
}) {
  if (!ordens.length) return <div className="suite-empty-block">{empty}</div>

  return (
    <div className="suite-table-list compact" role="list">
      {ordens.map((ordem) => (
        <article key={ordem.id} role="listitem">
          <div>
            <h3>{ordem.cliente_nome}</h3>
            <p>{ordem.numero} - {ordem.descricao_servico}</p>
          </div>
          <span className={`suite-pill ${tone(ordem.situacao_operacional)}`}>{statusLabel(ordem.situacao_operacional)}</span>
          <strong>{ordem.valor_label}</strong>
          <small>{ordem.numero_nfse ? `NFS-e ${ordem.numero_nfse}` : `${ordem.competencia ?? 'Sem competencia'} - ${statusLabel(ordem.situacao_fiscal)}`}</small>
          <Link className="button secondary" href={`/modulos/gkit-fat/faturas/${ordem.id}`}>Detalhes</Link>
        </article>
      ))}
    </div>
  )
}

function optionLabel(tipo: string) {
  const labels: Record<string, string> = {
    mensal: 'Mensal',
    pontual: 'Pontual',
    cobranca: 'Cobranca',
    pessoa_fisica: 'Pessoa fisica',
    pessoa_juridica: 'Pessoa juridica',
    condominio: 'Condominio',
  }
  return labels[tipo] ?? tipo
}

export function GkitFatContratoForm({
  action,
  contrato,
  formData,
}: {
  action: (formData: FormData) => Promise<void>
  contrato?: GkitFatContrato | null
  formData: GkitFatFormData
}) {
  return (
    <form action={action} className="card module-form module-form-grid">
      {contrato ? <input name="id" type="hidden" value={contrato.id} /> : null}
      <label className="module-form-wide">
        <span>Cliente</span>
        {contrato ? (
          <input disabled value={`${contrato.cliente_nome} - ${optionLabel(contrato.cliente_tipo)} - ${optionLabel(contrato.cliente_tipo_pessoa)}`} />
        ) : (
          <select name="cliente_id" required>
            <option value="">Selecione</option>
            {formData.clientes.map((cliente) => (
              <option key={cliente.id} value={cliente.id}>{cliente.label} - {cliente.meta}</option>
            ))}
          </select>
        )}
      </label>
      {!contrato ? (
        <label>
          <span>Numero</span>
          <input name="numero" placeholder="Automatico" />
        </label>
      ) : null}
      <label>
        <span>Tipo</span>
        <select name="tipo_faturamento" defaultValue={contrato?.tipo_faturamento ?? 'mensal'}>
          <option value="mensal">Mensal</option>
          <option value="pontual">Pontual</option>
          <option value="cobranca">Cobranca</option>
        </select>
      </label>
      <label>
        <span>Status</span>
        <select name="status" defaultValue={contrato?.status ?? 'em_elaboracao'}>
          <option value="em_elaboracao">Em elaboracao</option>
          <option value="ativo">Ativo</option>
          <option value="suspenso">Suspenso</option>
          <option value="cancelado">Cancelado</option>
          <option value="encerrado">Encerrado</option>
        </select>
      </label>
      <label>
        <span>Valor padrao</span>
        <input name="valor_padrao" inputMode="decimal" required defaultValue={contrato?.valor_padrao ?? 0} />
      </label>
      <label>
        <span>Periodicidade (meses)</span>
        <input name="periodicidade_meses" min={1} type="number" defaultValue={contrato?.periodicidade_meses ?? 1} />
      </label>
      <label>
        <span>Dia faturamento</span>
        <input name="dia_faturamento" min={1} max={31} type="number" defaultValue={contrato?.dia_faturamento ?? ''} />
      </label>
      <label>
        <span>Dia vencimento</span>
        <input name="dia_vencimento" min={1} max={31} type="number" defaultValue={contrato?.dia_vencimento ?? ''} />
      </label>
      <label>
        <span>Inicio vigencia</span>
        <input name="inicio_vigencia" type="date" defaultValue={contrato?.inicio_vigencia ?? ''} />
      </label>
      <label>
        <span>Fim vigencia</span>
        <input name="fim_vigencia" type="date" defaultValue={contrato?.fim_vigencia ?? ''} />
      </label>
      <label className="module-form-wide">
        <span>Descricao fiscal/servico</span>
        <input name="descricao_servico" defaultValue={contrato?.descricao_servico ?? 'Servicos advocaticios'} />
      </label>
      <label>
        <span>ISS retido</span>
        <input name="iss_retido" type="checkbox" defaultChecked={contrato?.iss_retido ?? false} />
      </label>
      <label>
        <span>Nao gerar financeiro</span>
        <input name="nao_gerar_financeiro" type="checkbox" defaultChecked={contrato ? !contrato.gerar_financeiro : false} />
      </label>
      {contrato ? (
        <label className="module-form-wide">
          <span>Motivo status</span>
          <input name="motivo_status" placeholder="Obrigatorio quando suspender/cancelar no processo interno" />
        </label>
      ) : null}
      <label className="module-form-wide">
        <span>Observacoes</span>
        <textarea name="observacoes" defaultValue={contrato?.observacoes ?? ''} rows={4} />
      </label>
      <div className="form-actions module-form-wide">
        <button className="button" type="submit">{contrato ? 'Atualizar contrato' : 'Criar contrato'}</button>
        <Link className="button secondary" href="/modulos/gkit-fat/contratos">Cancelar</Link>
      </div>
    </form>
  )
}

export function GkitFatOrdemForm({
  action,
  formData,
}: {
  action: (formData: FormData) => Promise<void>
  formData: GkitFatFormData
}) {
  return (
    <form action={action} className="card module-form module-form-grid">
      <label className="module-form-wide">
        <span>Contrato</span>
        <select name="contrato_id">
          <option value="">OS avulsa sem contrato</option>
          {formData.contratos.map((contrato) => (
            <option key={contrato.id} value={contrato.id}>{contrato.label}</option>
          ))}
        </select>
      </label>
      <label className="module-form-wide">
        <span>Cliente para OS avulsa</span>
        <select name="cliente_id">
          <option value="">Usar cliente do contrato</option>
          {formData.clientes.map((cliente) => (
            <option key={cliente.id} value={cliente.id}>{cliente.label} - {cliente.meta}</option>
          ))}
        </select>
      </label>
      <label>
        <span>Competencia</span>
        <input name="competencia" type="date" />
      </label>
      <label>
        <span>Vencimento</span>
        <input name="data_vencimento" type="date" />
      </label>
      <label>
        <span>Periodo inicio</span>
        <input name="periodo_inicio" type="date" />
      </label>
      <label>
        <span>Periodo fim</span>
        <input name="periodo_fim" type="date" />
      </label>
      <label>
        <span>Previsao faturamento</span>
        <input name="data_prevista_faturamento" type="date" />
      </label>
      <label>
        <span>Valor</span>
        <input name="valor_unitario" inputMode="decimal" placeholder="Usar valor do contrato" />
      </label>
      <label>
        <span>Situacao</span>
        <select name="situacao_operacional" defaultValue="rascunho">
          <option value="rascunho">Rascunho</option>
          <option value="em_conferencia">Em conferencia</option>
          <option value="pronta_para_faturar">Pronta para faturar</option>
        </select>
      </label>
      <label className="module-form-wide">
        <span>Descricao fiscal/servico</span>
        <input name="descricao_servico" placeholder="Usar descricao do contrato" />
      </label>
      <div className="form-actions module-form-wide">
        <button className="button" type="submit">Gerar OS</button>
      </div>
    </form>
  )
}

export function GkitFatEmpresaEmissoraForm({
  action,
  empresa,
}: {
  action: (formData: FormData) => Promise<void>
  empresa?: GkitFatEmpresaEmissora | null
}) {
  return (
    <form action={action} className="card module-form module-form-grid">
      {empresa ? <input name="id" type="hidden" value={empresa.id} /> : null}
      <label>
        <span>Nome</span>
        <input name="nome" required defaultValue={empresa?.nome ?? 'Genske Advogados'} />
      </label>
      <label>
        <span>Razao social</span>
        <input name="razao_social" defaultValue={empresa?.razao_social ?? ''} />
      </label>
      <label>
        <span>CNPJ</span>
        <input name="cnpj" defaultValue={empresa?.cnpj ?? ''} />
      </label>
      <label>
        <span>Inscricao municipal</span>
        <input name="inscricao_municipal" defaultValue={empresa?.inscricao_municipal ?? ''} />
      </label>
      <label>
        <span>Municipio</span>
        <input name="municipio" defaultValue={empresa?.municipio ?? ''} />
      </label>
      <label>
        <span>Codigo IBGE</span>
        <input name="codigo_municipio_ibge" defaultValue={empresa?.codigo_municipio_ibge ?? ''} />
      </label>
      <label>
        <span>Regime tributario</span>
        <input name="regime_tributario" placeholder="Ex.: Simples Nacional" defaultValue={empresa?.regime_tributario ?? ''} />
      </label>
      <label>
        <span>Regime especial</span>
        <input name="regime_especial_tributacao" defaultValue={empresa?.regime_especial_tributacao ?? ''} />
      </label>
      <label>
        <span>Ambiente</span>
        <select name="ambiente" defaultValue={empresa?.ambiente ?? 'homologacao'}>
          <option value="homologacao">Homologacao</option>
          <option value="producao">Producao</option>
        </select>
      </label>
      <label>
        <span>Serie RPS</span>
        <input name="serie_rps" defaultValue={empresa?.serie_rps ?? ''} />
      </label>
      <label>
        <span>Proximo RPS</span>
        <input name="proximo_numero_rps" min={1} type="number" defaultValue={empresa?.proximo_numero_rps ?? ''} />
      </label>
      <label>
        <span>Aliquota ISS</span>
        <input name="aliquota_iss" inputMode="decimal" placeholder="Ex.: 2.00" defaultValue={empresa?.aliquota_iss ?? ''} />
      </label>
      <label>
        <span>Certificado</span>
        <input name="certificado_alias" placeholder="Alias interno, sem anexar o arquivo" defaultValue={empresa?.certificado_alias ?? ''} />
      </label>
      <label>
        <span>Validade certificado</span>
        <input name="certificado_validade" type="date" defaultValue={empresa?.certificado_validade ?? ''} />
      </label>
      <label>
        <span>ISS retido padrao</span>
        <input name="iss_retido_padrao" type="checkbox" defaultChecked={empresa?.iss_retido_padrao ?? false} />
      </label>
      <label>
        <span>Ativo</span>
        <input name="ativo" type="checkbox" defaultChecked={empresa?.ativo ?? true} />
      </label>
      <label className="module-form-wide">
        <span>Observacoes</span>
        <textarea name="observacoes" rows={4} defaultValue={empresa?.observacoes ?? ''} />
      </label>
      <div className="form-actions module-form-wide">
        <button className="button" type="submit">Salvar configuracao fiscal</button>
      </div>
    </form>
  )
}

export function GkitFatNfseWorkbench({
  canWrite,
  empresas,
  ordem,
  prepareAction,
  registerAction,
}: {
  canWrite: boolean
  empresas: GkitFatEmpresaEmissora[]
  ordem: GkitFatOrdemServicoDetail
  prepareAction: (formData: FormData) => Promise<void>
  registerAction: (formData: FormData) => Promise<void>
}) {
  return (
    <div className="module-form-grid">
      <section className="card module-form module-form-wide">
        <div className="suite-panel-heading">
          <div>
            <h2>{ordem.numero}</h2>
            <p>{ordem.cliente_nome} - {ordem.descricao_servico}</p>
          </div>
          <span className={`suite-pill ${tone(ordem.situacao_fiscal)}`}>{statusLabel(ordem.situacao_fiscal)}</span>
        </div>

        <div className="suite-executive-grid">
          <article className="suite-executive-card"><span>Valor</span><h2>{ordem.valor_label}</h2></article>
          <article className="suite-executive-card"><span>Operacional</span><h2>{statusLabel(ordem.situacao_operacional)}</h2></article>
          <article className="suite-executive-card"><span>Financeiro</span><h2>{statusLabel(ordem.situacao_financeira)}</h2></article>
          <article className="suite-executive-card"><span>NFS-e</span><h2>{ordem.numero_nfse ?? 'Pendente'}</h2></article>
        </div>

        <div className={ordem.validacao_fiscal.ok ? 'suite-empty-block success' : 'suite-empty-block warning'}>
          <strong>{ordem.validacao_fiscal.ok ? 'Pre-nota pronta' : 'Conferencia fiscal pendente'}</strong>
          {ordem.validacao_fiscal.erros.length ? <span>{ordem.validacao_fiscal.erros.join(' | ')}</span> : null}
          {ordem.validacao_fiscal.alertas.length ? <small>{ordem.validacao_fiscal.alertas.join(' | ')}</small> : null}
          {!ordem.validacao_fiscal.erros.length && !ordem.validacao_fiscal.alertas.length ? <span>Dados minimos conferidos para emissao manual.</span> : null}
        </div>

        {canWrite ? (
          <form action={prepareAction} className="module-form-grid">
            <input name="id" type="hidden" value={ordem.id} />
            <label className="module-form-wide">
              <span>Empresa emissora</span>
              <select name="empresa_emissora_id" defaultValue={ordem.empresa_emissora_id ?? empresas[0]?.id ?? ''}>
                <option value="">Selecionar automaticamente</option>
                {empresas.map((empresa) => (
                  <option key={empresa.id} value={empresa.id}>{empresa.nome} - {empresa.ambiente}</option>
                ))}
              </select>
            </label>
            <div className="form-actions module-form-wide">
              <button className="button" type="submit">Conferir pre-nota</button>
              <Link className="button secondary" href="/modulos/gkit-fat/faturas">Voltar</Link>
            </div>
          </form>
        ) : (
          <div className="form-actions module-form-wide">
            <Link className="button secondary" href="/modulos/gkit-fat/faturas">Voltar</Link>
          </div>
        )}
      </section>

      <section className="card module-form module-form-wide">
        <div className="suite-panel-heading">
          <div>
            <h2>Retorno da emissao</h2>
            <p>Registro manual enquanto o conector automatico nao estiver ativo.</p>
          </div>
        </div>
        {canWrite ? <form action={registerAction} className="module-form-grid">
          <input name="id" type="hidden" value={ordem.id} />
          <label>
            <span>Resultado</span>
            <select name="resultado" defaultValue="autorizada">
              <option value="autorizada">Autorizada</option>
              <option value="rejeitada">Rejeitada</option>
            </select>
          </label>
          <label>
            <span>Numero NFS-e</span>
            <input name="numero_nfse" defaultValue={ordem.numero_nfse ?? ''} />
          </label>
          <label>
            <span>Codigo verificacao</span>
            <input name="codigo_verificacao" defaultValue={ordem.codigo_verificacao ?? ''} />
          </label>
          <label>
            <span>Link NFS-e</span>
            <input name="nfse_url" defaultValue={ordem.nfse_url ?? ''} />
          </label>
          <label>
            <span>XML</span>
            <input name="xml_url" defaultValue={ordem.xml_url ?? ''} />
          </label>
          <label>
            <span>PDF</span>
            <input name="pdf_url" defaultValue={ordem.pdf_url ?? ''} />
          </label>
          <label className="module-form-wide">
            <span>Motivo rejeicao</span>
            <input name="motivo_rejeicao" defaultValue={ordem.motivo_rejeicao ?? ''} />
          </label>
          <label className="module-form-wide">
            <span>Observacoes</span>
            <textarea name="observacoes" rows={3} />
          </label>
          <div className="form-actions module-form-wide">
            <button className="button" type="submit">Registrar retorno</button>
          </div>
        </form> : <div className="suite-empty-block">Voce nao tem permissao para registrar retorno fiscal.</div>}
      </section>

      <GkitFatSection title="Payload fiscal" description="Base que sera enviada ao conector quando a integracao automatica entrar.">
        <pre className="suite-empty-block">{JSON.stringify(ordem.nfse_payload, null, 2)}</pre>
      </GkitFatSection>

      <GkitFatSection title="Historico NFS-e">
        {ordem.eventos.length ? (
          <div className="suite-table-list compact">
            {ordem.eventos.map((evento) => (
              <article key={evento.id}>
                <div>
                  <h3>{statusLabel(evento.tipo_evento)}</h3>
                  <p>{evento.observacoes ?? 'Sem observacoes'}</p>
                </div>
                <span className={`suite-pill ${tone(evento.status_fiscal_novo ?? evento.tipo_evento)}`}>{statusLabel(evento.status_fiscal_novo ?? evento.tipo_evento)}</span>
                <strong>{evento.criado_em}</strong>
                <small>{evento.status_fiscal_anterior ? `${statusLabel(evento.status_fiscal_anterior)} -> ${statusLabel(evento.status_fiscal_novo ?? '')}` : 'Registro fiscal'}</small>
              </article>
            ))}
          </div>
        ) : <div className="suite-empty-block">Nenhum evento fiscal registrado.</div>}
      </GkitFatSection>
    </div>
  )
}
