'use client';

import { useEffect, useMemo, useState } from 'react';
import { EmptyState, MetricCard, StatusBadge } from '../ui/FlexUI';

type CadastroTipo = 'categoria' | 'centro' | 'carteira';
type CadastroNatureza = 'receita' | 'despesa' | 'ambos';

type CommissionRuleConfig = {
  ativa: boolean;
  label: string;
  matchers: string[];
  reductionRate: number;
  commissionRate: number;
  splitBy: number;
};

type CadastroItem = {
  id: string;
  tipo: CadastroTipo;
  nome: string;
  slug: string;
  status: 'ativo' | 'inativo';
  origem: string;
  usos: number;
  aliases: string[];
  naoGerarAutomaticamenteNaPrevia: boolean;
  natureza: CadastroNatureza | null;
  centroId: string | null;
  centroNome: string | null;
  comissao?: CommissionRuleConfig | null;
};

type CadastroResumo = {
  configured: boolean;
  categorias: CadastroItem[];
  centros: CadastroItem[];
  carteiras: CadastroItem[];
  totais: {
    categorias: number;
    centros: number;
    carteiras: number;
    aliases: number;
    regrasComissao: number;
  };
};

type CadastroSavePayload = {
  id?: string;
  tipo: CadastroTipo;
  nome: string;
  status: 'ativo' | 'inativo';
  aliases: string[];
  natureza?: CadastroNatureza | null;
  centroId?: string | null;
};

type CommissionRuleSavePayload = {
  cadastroId: string;
  ativa: boolean;
  matchers: string[];
  reductionPercent: number;
  commissionPercent: number;
  splitBy: number;
};

function plural(value: number, singular: string, pluralLabel: string) {
  return `${value} ${value === 1 ? singular : pluralLabel}`;
}

function splitList(value: string) {
  return value
    .split(/[\n,;]/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function rateToPercent(value: number | undefined) {
  return Math.round(Number(value || 0) * 10000) / 100;
}

function naturezaLabel(value: CadastroNatureza | null | undefined) {
  if (value === 'receita') return 'Receita';
  if (value === 'despesa') return 'Despesa';
  return 'Ambos';
}

function naturezaBadgeStatus(value: CadastroNatureza | null | undefined) {
  if (value === 'receita') return 'ok' as const;
  if (value === 'despesa') return 'aviso' as const;
  return 'aberto' as const;
}

function origemLabel(value: string) {
  if (value === 'contas_pagar') return 'Pagamentos';
  if (value === 'comissoes') return 'Comissoes';
  if (value === 'mista') return 'Mista';
  return 'Manual';
}

function tipoLabel(tipo: CadastroTipo) {
  if (tipo === 'categoria') return 'Categoria';
  if (tipo === 'centro') return 'Centro';
  return 'Carteira';
}

function CadastroTable({
  centros = [],
  tipo,
  title,
  description,
  items,
  showForecastRule = false,
  savingRuleId = '',
  onToggleForecastRule,
  onSave,
}: {
  centros?: CadastroItem[];
  tipo: CadastroTipo;
  title: string;
  description: string;
  items: CadastroItem[];
  showForecastRule?: boolean;
  savingRuleId?: string;
  onToggleForecastRule?: (item: CadastroItem, checked: boolean) => Promise<void>;
  onSave: (input: CadastroSavePayload) => Promise<void>;
}) {
  const [filter, setFilter] = useState('');
  const [collapsed, setCollapsed] = useState(true);
  const [editing, setEditing] = useState<CadastroItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formStatus, setFormStatus] = useState<'ativo' | 'inativo'>('ativo');
  const [formAliases, setFormAliases] = useState('');
  const [formNatureza, setFormNatureza] = useState<CadastroNatureza>('ambos');
  const [formCentroId, setFormCentroId] = useState('');
  const [naturezaFilter, setNaturezaFilter] = useState<'todas' | CadastroNatureza>('todas');
  const [centroFilter, setCentroFilter] = useState('todos');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const filtered = useMemo(() => {
    const term = filter.trim().toLowerCase();
    return items.filter((item) => {
      if (tipo === 'categoria' && naturezaFilter !== 'todas' && item.natureza !== naturezaFilter) return false;
      if (tipo === 'categoria' && centroFilter !== 'todos') {
        if (centroFilter === 'sem_centro') {
          if (item.centroId) return false;
        } else if (item.centroId !== centroFilter) {
          return false;
        }
      }
      if (!term) return true;
      return (
        item.nome.toLowerCase().includes(term) ||
        item.slug.toLowerCase().includes(term) ||
        item.aliases.some((alias) => alias.toLowerCase().includes(term))
      );
    });
  }, [centroFilter, filter, items, naturezaFilter, tipo]);

  function startNew() {
    setEditing(null);
    setFormName('');
    setFormStatus('ativo');
    setFormAliases('');
    setFormNatureza('ambos');
    setFormCentroId('');
    setFormError('');
    setFormOpen(true);
  }

  function startEdit(item: CadastroItem) {
    setEditing(item);
    setFormName(item.nome);
    setFormStatus(item.status);
    setFormAliases(item.aliases.join(', '));
    setFormNatureza(item.natureza || 'ambos');
    setFormCentroId(item.centroId || '');
    setFormError('');
    setFormOpen(true);
  }

  async function submitForm() {
    const nome = formName.trim();
    if (!nome) {
      setFormError('Informe o nome.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await onSave({
        id: editing?.id,
        tipo,
        nome,
        status: formStatus,
        aliases: splitList(formAliases),
        natureza: tipo === 'categoria' ? formNatureza : null,
        centroId: tipo === 'categoria' ? formCentroId || null : null,
      });
      setFormOpen(false);
      setEditing(null);
      setFormName('');
      setFormAliases('');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao salvar cadastro.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(item: CadastroItem) {
    setSaving(true);
    setFormError('');
    try {
      await onSave({
        id: item.id,
        tipo: item.tipo,
        nome: item.nome,
        status: item.status === 'ativo' ? 'inativo' : 'ativo',
        aliases: item.aliases,
        natureza: item.natureza,
        centroId: item.centroId,
      });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao alterar status.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card master-data-section">
      <div className="header-row compact-header">
        <div>
          <p className="eyebrow">Cadastro</p>
          <h2>{title}</h2>
          <p className="muted small-text">{description}</p>
        </div>
        <div className="master-data-actions">
          <button type="button" className="secondary-button" onClick={startNew}>
            Novo
          </button>
          <label className="field-label compact-filter">
            Filtrar
            <input className="text-input" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Buscar nome ou alias" />
          </label>
          {tipo === 'categoria' ? (
            <label className="field-label compact-filter">
              Natureza
              <select className="text-input" value={naturezaFilter} onChange={(event) => setNaturezaFilter(event.target.value as 'todas' | CadastroNatureza)}>
                <option value="todas">Todas</option>
                <option value="receita">Receita</option>
                <option value="despesa">Despesa</option>
                <option value="ambos">Ambos</option>
              </select>
            </label>
          ) : null}
          {tipo === 'categoria' ? (
            <label className="field-label compact-filter">
              Centro
              <select className="text-input" value={centroFilter} onChange={(event) => setCentroFilter(event.target.value)}>
                <option value="todos">Todos</option>
                <option value="sem_centro">Sem centro</option>
                {centros.filter((centro) => centro.status === 'ativo').map((centro) => (
                  <option key={centro.id} value={centro.id}>{centro.nome}</option>
                ))}
              </select>
            </label>
          ) : null}
          <button type="button" className="secondary-button" onClick={() => setCollapsed((value) => !value)}>
            {collapsed ? 'Expandir' : 'Recolher'}
          </button>
        </div>
      </div>

      {formError ? <div className="error">{formError}</div> : null}
      {formOpen ? (
        <div className="inline-edit-panel">
          <div className="form-grid">
            <label className="field-label">
              Nome
              <input className="text-input" value={formName} onChange={(event) => setFormName(event.target.value)} placeholder={`Nome da ${tipoLabel(tipo).toLowerCase()}`} />
            </label>
            <label className="field-label">
              Status
              <select className="text-input" value={formStatus} onChange={(event) => setFormStatus(event.target.value as 'ativo' | 'inativo')}>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </label>
            {tipo === 'categoria' ? (
              <label className="field-label">
                Natureza
                <select className="text-input" value={formNatureza} onChange={(event) => setFormNatureza(event.target.value as CadastroNatureza)}>
                  <option value="receita">Receita</option>
                  <option value="despesa">Despesa</option>
                  <option value="ambos">Ambos</option>
                </select>
              </label>
            ) : null}
            {tipo === 'categoria' ? (
              <label className="field-label">
                Centro associado
                <select className="text-input" value={formCentroId} onChange={(event) => setFormCentroId(event.target.value)}>
                  <option value="">Sem centro associado</option>
                  {centros.filter((centro) => centro.status === 'ativo' || centro.id === formCentroId).map((centro) => (
                    <option key={centro.id} value={centro.id}>{centro.nome}</option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="field-label wide-field">
              Aliases
              <input className="text-input" value={formAliases} onChange={(event) => setFormAliases(event.target.value)} placeholder="Separe por virgula" />
            </label>
          </div>
          <div className="action-row">
            <button type="button" className="secondary-button" onClick={() => setFormOpen(false)} disabled={saving}>Cancelar</button>
            <button type="button" className="primary-button" onClick={submitForm} disabled={saving}>{saving ? 'Salvando...' : editing ? 'Salvar edicao' : 'Criar cadastro'}</button>
          </div>
        </div>
      ) : null}

      {collapsed ? (
        <div className="collapsed-list-summary">
          {plural(filtered.length, 'item oculto', 'itens ocultos')}
        </div>
      ) : filtered.length ? (
        <div className="table-wrap">
          <table className="periods-table">
            <thead>
              <tr>
                <th>Nome canonico</th>
                <th>Origem</th>
                {tipo === 'categoria' ? <th>Natureza</th> : null}
                {tipo === 'categoria' ? <th>Centro</th> : null}
                <th>Status</th>
                <th className="text-right">Usos</th>
                {showForecastRule ? <th>Previa</th> : null}
                <th>Aliases</th>
                <th className="text-right">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.nome}</strong>
                    <p className="muted small-text">{item.slug}</p>
                  </td>
                  <td>{origemLabel(item.origem)}</td>
                  {tipo === 'categoria' ? (
                    <td><StatusBadge status={naturezaBadgeStatus(item.natureza)} label={naturezaLabel(item.natureza)} compact /></td>
                  ) : null}
                  {tipo === 'categoria' ? (
                    <td>{item.centroNome || <span className="muted small-text">Sem centro</span>}</td>
                  ) : null}
                  <td><StatusBadge status={item.status === 'ativo' ? 'ok' : 'indisponivel'} label={item.status === 'ativo' ? 'Ativo' : 'Inativo'} compact /></td>
                  <td className="text-right">{item.usos}</td>
                  {showForecastRule ? (
                    <td>
                      <label className="checkbox-row compact-checkbox-row">
                        <input
                          type="checkbox"
                          checked={item.naoGerarAutomaticamenteNaPrevia}
                          disabled={savingRuleId === item.id || !onToggleForecastRule}
                          onChange={(event) => onToggleForecastRule?.(item, event.target.checked)}
                        />
                        <span>{savingRuleId === item.id ? 'Salvando...' : 'Nao gerar automaticamente'}</span>
                      </label>
                    </td>
                  ) : null}
                  <td className="small-text muted">{item.aliases.length ? item.aliases.join(', ') : '-'}</td>
                  <td className="text-right">
                    <div className="row-actions">
                      <button type="button" className="secondary-button compact-button" onClick={() => startEdit(item)}>Editar</button>
                      <button type="button" className="secondary-button compact-button" onClick={() => toggleStatus(item)} disabled={saving}>
                        {item.status === 'ativo' ? 'Inativar' : 'Ativar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="Nenhum cadastro encontrado" description="Extraia cadastros dos dados operacionais ou importe planilhas para alimentar essa lista." />
      )}
    </section>
  );
}

function CommissionRulesTable({
  categorias,
  savingId,
  onSave,
}: {
  categorias: CadastroItem[];
  savingId: string;
  onSave: (input: CommissionRuleSavePayload) => Promise<void>;
}) {
  const [editing, setEditing] = useState<CadastroItem | null>(null);
  const [ativa, setAtiva] = useState(true);
  const [matchers, setMatchers] = useState('');
  const [reductionPercent, setReductionPercent] = useState('0');
  const [commissionPercent, setCommissionPercent] = useState('0');
  const [splitBy, setSplitBy] = useState('1');
  const [filter, setFilter] = useState('');
  const [naturezaFilter, setNaturezaFilter] = useState<'todas' | CadastroNatureza>('todas');
  const [collapsed, setCollapsed] = useState(true);
  const [error, setError] = useState('');

  const filtered = useMemo(() => {
    const term = filter.trim().toLowerCase();
    return categorias.filter((item) => {
      if (naturezaFilter !== 'todas' && item.natureza !== naturezaFilter) return false;
      if (!term) return true;
      return (
        item.nome.toLowerCase().includes(term) ||
        item.slug.toLowerCase().includes(term) ||
        item.comissao?.matchers.some((matcher) => matcher.toLowerCase().includes(term))
      );
    });
  }, [categorias, filter, naturezaFilter]);

  function startEdit(item: CadastroItem) {
    const rule = item.comissao;
    setEditing(item);
    setAtiva(rule?.ativa ?? true);
    setMatchers((rule?.matchers?.length ? rule.matchers : [item.nome]).join(', '));
    setReductionPercent(String(rateToPercent(rule?.reductionRate)));
    setCommissionPercent(String(rateToPercent(rule?.commissionRate)));
    setSplitBy(String(rule?.splitBy || 1));
    setError('');
  }

  async function submit() {
    if (!editing) return;
    setError('');
    try {
      await onSave({
        cadastroId: editing.id,
        ativa,
        matchers: splitList(matchers),
        reductionPercent: Number(String(reductionPercent).replace(',', '.')),
        commissionPercent: Number(String(commissionPercent).replace(',', '.')),
        splitBy: Number(splitBy || 1),
      });
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar regra de comissao.');
    }
  }

  return (
    <section className="card master-data-section">
      <div className="header-row compact-header">
        <div>
          <p className="eyebrow">Comissoes</p>
          <h2>Regras por categoria</h2>
          <p className="muted small-text">Defina quais categorias geram comissao, o redutor, o percentual e o divisor aplicados na apuracao.</p>
        </div>
        <label className="field-label compact-filter">
          Filtrar
          <input className="text-input" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Buscar categoria" />
        </label>
        <label className="field-label compact-filter">
          Natureza
          <select className="text-input" value={naturezaFilter} onChange={(event) => setNaturezaFilter(event.target.value as 'todas' | CadastroNatureza)}>
            <option value="todas">Todas</option>
            <option value="receita">Receita</option>
            <option value="despesa">Despesa</option>
            <option value="ambos">Ambos</option>
          </select>
        </label>
        <button type="button" className="secondary-button" onClick={() => setCollapsed((value) => !value)}>
          {collapsed ? 'Expandir' : 'Recolher'}
        </button>
      </div>

      {error ? <div className="error">{error}</div> : null}
      {!collapsed && editing ? (
        <div className="inline-edit-panel">
          <div className="form-grid">
            <label className="field-label">
              Categoria
              <input className="text-input" value={editing.nome} disabled />
            </label>
            <label className="field-label">
              Redutor %
              <input className="text-input" inputMode="decimal" value={reductionPercent} onChange={(event) => setReductionPercent(event.target.value)} />
            </label>
            <label className="field-label">
              Comissao %
              <input className="text-input" inputMode="decimal" value={commissionPercent} onChange={(event) => setCommissionPercent(event.target.value)} />
            </label>
            <label className="field-label">
              Divisor
              <input className="text-input" inputMode="numeric" value={splitBy} onChange={(event) => setSplitBy(event.target.value)} />
            </label>
            <label className="field-label wide-field">
              Termos que identificam a categoria
              <input className="text-input" value={matchers} onChange={(event) => setMatchers(event.target.value)} placeholder="Separe por virgula" />
            </label>
            <label className="checkbox-row compact-checkbox-row">
              <input type="checkbox" checked={ativa} onChange={(event) => setAtiva(event.target.checked)} />
              <span>Regra ativa</span>
            </label>
          </div>
          <div className="action-row">
            <button type="button" className="secondary-button" onClick={() => setEditing(null)} disabled={savingId === editing.id}>Cancelar</button>
            <button type="button" className="primary-button" onClick={submit} disabled={savingId === editing.id}>{savingId === editing.id ? 'Salvando...' : 'Salvar regra'}</button>
          </div>
        </div>
      ) : null}

      {collapsed ? (
        <div className="collapsed-list-summary">
          {plural(filtered.length, 'regra oculta', 'regras ocultas')}
        </div>
      ) : (
      <div className="table-wrap">
        <table className="periods-table">
          <thead>
            <tr>
              <th>Categoria</th>
              <th>Natureza</th>
              <th>Status</th>
              <th>Redutor</th>
              <th>Comissao</th>
              <th>Divisor</th>
              <th>Termos</th>
              <th className="text-right">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length ? filtered.map((item) => {
              const rule = item.comissao;
              return (
                <tr key={item.id}>
                  <td>
                    <strong>{item.nome}</strong>
                    <p className="muted small-text">{item.slug}</p>
                  </td>
                  <td><StatusBadge status={naturezaBadgeStatus(item.natureza)} label={naturezaLabel(item.natureza)} compact /></td>
                  <td><StatusBadge status={rule?.ativa ? 'ok' : 'indisponivel'} label={rule ? (rule.ativa ? 'Ativa' : 'Inativa') : 'Sem regra'} compact /></td>
                  <td>{rule ? `${rateToPercent(rule.reductionRate)}%` : '-'}</td>
                  <td>{rule ? `${rateToPercent(rule.commissionRate)}%` : '-'}</td>
                  <td>{rule?.splitBy || '-'}</td>
                  <td className="small-text muted">{rule?.matchers?.length ? rule.matchers.join(', ') : '-'}</td>
                  <td className="text-right">
                    <button type="button" className="secondary-button compact-button" onClick={() => startEdit(item)}>
                      {rule ? 'Editar' : 'Configurar'}
                    </button>
                  </td>
                </tr>
              );
            }) : (
              <tr><td colSpan={8}>Nenhuma categoria encontrada.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      )}
    </section>
  );
}

export function MasterDataPage() {
  const [data, setData] = useState<CadastroResumo | null>(null);
  const [savingRuleId, setSavingRuleId] = useState('');
  const [savingCommissionRuleId, setSavingCommissionRuleId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function load() {
    setError('');
    try {
      const response = await fetch('/api/gkit-flex/cadastros/resumo');
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Erro ao carregar cadastros.');
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar cadastros.');
    }
  }

  async function toggleForecastRule(item: CadastroItem, checked: boolean) {
    setSavingRuleId(item.id);
    setError('');
    setSuccess('');
    try {
      const response = await fetch('/api/gkit-flex/cadastros/regras-previsao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cadastroId: item.id, naoGerarAutomaticamente: checked }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Erro ao atualizar regra da categoria.');
      setData(payload.resumo);
      setSuccess(checked ? `${item.nome}: nao sera gerada automaticamente na previa.` : `${item.nome}: voltou a ser gerada automaticamente na previa.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar regra da categoria.');
    } finally {
      setSavingRuleId('');
    }
  }

  async function saveCadastro(input: CadastroSavePayload) {
    setError('');
    setSuccess('');
    const response = await fetch('/api/gkit-flex/cadastros/item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Erro ao salvar cadastro.');
    setData(payload.resumo);
    setSuccess(`${tipoLabel(input.tipo)} salva: ${input.nome}.`);
  }

  async function saveCommissionRule(input: CommissionRuleSavePayload) {
    setSavingCommissionRuleId(input.cadastroId);
    setError('');
    setSuccess('');
    try {
      const response = await fetch('/api/gkit-flex/cadastros/regras-comissao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Erro ao salvar regra de comissao.');
      setData(payload.resumo);
      setSuccess('Regra de comissao atualizada.');
    } finally {
      setSavingCommissionRuleId('');
    }
  }

  useEffect(() => {
    load();
  }, []);

  const totals = data?.totais || { categorias: 0, centros: 0, carteiras: 0, aliases: 0, regrasComissao: 0 };

  return (
    <main className="page-shell master-data-page">
      <section className="module-page-hero month-context-header">
        <div className="module-page-hero-main">
          <div className="module-page-hero-title">
            <div className="month-context-main">
              <p className="platform-kicker eyebrow">GKIT Flex</p>
              <h1>Cadastros e normalizacao</h1>
              <p className="muted">Controle nomes canonicos de categorias, centros e carteiras. Novos nomes continuam podendo nascer pela importacao, mas agora podem ser fundidos com seguranca.</p>
            </div>
          </div>
        </div>
      </section>

      {error ? <div className="error">{error}</div> : null}
      {success ? <div className="success">{success}</div> : null}
      {!data?.configured ? <div className="warning">Supabase ainda nao configurado. Configure o `.env.local` e rode o schema atualizado antes de usar os cadastros.</div> : null}

      <section className="grid-4 dashboard-metrics">
        <MetricCard label="Categorias" value={totals.categorias} help={plural(totals.categorias, 'nome canonico', 'nomes canonicos')} />
        <MetricCard label="Centros" value={totals.centros} help={plural(totals.centros, 'centro padronizado', 'centros padronizados')} />
        <MetricCard label="Carteiras" value={totals.carteiras} help={plural(totals.carteiras, 'carteira', 'carteiras')} />
        <MetricCard label="Regras" value={totals.regrasComissao} help="categorias com comissao ativa" tone={totals.regrasComissao ? 'good' : 'default'} />
      </section>

      <CommissionRulesTable categorias={data?.categorias || []} savingId={savingCommissionRuleId} onSave={saveCommissionRule} />

      <CadastroTable
        centros={data?.centros || []}
        tipo="categoria"
        title="Categorias"
        description="Categorias usadas em pagamentos e comissoes."
        items={data?.categorias || []}
        showForecastRule
        savingRuleId={savingRuleId}
        onToggleForecastRule={toggleForecastRule}
        onSave={saveCadastro}
      />
      <CadastroTable tipo="centro" title="Centros" description="Centros gerenciais usados em pagamentos." items={data?.centros || []} onSave={saveCadastro} />
      <CadastroTable tipo="carteira" title="Carteiras" description="Carteiras/vendedores usados no calculo de comissoes." items={data?.carteiras || []} onSave={saveCadastro} />
    </main>
  );
}
