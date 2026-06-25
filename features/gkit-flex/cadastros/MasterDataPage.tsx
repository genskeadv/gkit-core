'use client';

import { useEffect, useMemo, useState } from 'react';
import { EmptyState, MetricCard, MonthContextHeader, StatusBadge } from '../ui/FlexUI';

type CadastroTipo = 'categoria' | 'centro' | 'carteira';

type CadastroItem = {
  id: string;
  tipo: CadastroTipo;
  nome: string;
  slug: string;
  status: 'ativo' | 'inativo';
  origem: string;
  usos: number;
  aliases: string[];
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
  };
};

type ReclassPreview = {
  tipo: CadastroTipo;
  origem: { id: string; nome: string; aliases: string[] };
  destino: { id: string; nome: string; aliases: string[] };
  nomesAfetados: string[];
  impacto: Record<string, number> & { total: number };
  bloqueios: string[];
  avisos: string[];
  totalAtualizado?: number;
};

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function plural(value: number, singular: string, pluralLabel: string) {
  return `${value} ${value === 1 ? singular : pluralLabel}`;
}

function origemLabel(value: string) {
  if (value === 'contas_pagar') return 'Contas a pagar';
  if (value === 'comissoes') return 'Comissões';
  if (value === 'mista') return 'Mista';
  return 'Manual';
}

function tipoLabel(tipo: CadastroTipo) {
  if (tipo === 'categoria') return 'Categoria';
  if (tipo === 'centro') return 'Centro';
  return 'Carteira';
}

function activeItems(data: CadastroResumo | null, tipo: CadastroTipo) {
  const list = tipo === 'categoria' ? data?.categorias : tipo === 'centro' ? data?.centros : data?.carteiras;
  return (list || []).filter((item) => item.status === 'ativo');
}

function impactRows(preview: ReclassPreview | null) {
  if (!preview) return [];
  return [
    ['Contas a pagar — categoria', preview.impacto.contasPagarCategoria || 0],
    ['Contas a pagar — centro', preview.impacto.contasPagarCentro || 0],
    ['Comissões resumo — categoria', preview.impacto.comissaoResumoCategoria || 0],
    ['Comissões resumo — carteira', preview.impacto.comissaoResumoCarteira || 0],
    ['Comissões lançamentos — categoria', preview.impacto.comissaoLancamentoCategoria || 0],
    ['Comissões lançamentos — carteira', preview.impacto.comissaoLancamentoCarteira || 0],
    ['Comissões auditoria — categoria', preview.impacto.comissaoAuditoriaCategoria || 0],
    ['Comissões auditoria — carteira', preview.impacto.comissaoAuditoriaCarteira || 0],
  ].filter(([, value]) => Number(value) > 0);
}

function CadastroTable({ title, description, items }: { title: string; description: string; items: CadastroItem[] }) {
  const [filter, setFilter] = useState('');
  const filtered = useMemo(() => {
    const term = filter.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) =>
      item.nome.toLowerCase().includes(term) ||
      item.slug.toLowerCase().includes(term) ||
      item.aliases.some((alias) => alias.toLowerCase().includes(term))
    );
  }, [filter, items]);

  return (
    <section className="card master-data-section">
      <div className="header-row compact-header">
        <div>
          <p className="eyebrow">Cadastro</p>
          <h2>{title}</h2>
          <p className="muted small-text">{description}</p>
        </div>
        <label className="field-label compact-filter">
          Filtrar
          <input className="text-input" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Buscar nome ou alias" />
        </label>
      </div>

      {filtered.length ? (
        <div className="table-wrap">
          <table className="periods-table">
            <thead>
              <tr>
                <th>Nome canônico</th>
                <th>Origem</th>
                <th>Status</th>
                <th className="text-right">Usos</th>
                <th>Aliases</th>
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
                  <td><StatusBadge status={item.status === 'ativo' ? 'ok' : 'indisponivel'} label={item.status === 'ativo' ? 'Ativo' : 'Inativo'} compact /></td>
                  <td className="text-right">{item.usos}</td>
                  <td className="small-text muted">{item.aliases.length ? item.aliases.join(', ') : '—'}</td>
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

function ReclassificationPanel({ data, onDone }: { data: CadastroResumo | null; onDone: () => Promise<void> }) {
  const [tipo, setTipo] = useState<CadastroTipo>('categoria');
  const [origemId, setOrigemId] = useState('');
  const [destinoId, setDestinoId] = useState('');
  const [motivo, setMotivo] = useState('');
  const [preview, setPreview] = useState<ReclassPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const options = activeItems(data, tipo);

  useEffect(() => {
    setOrigemId('');
    setDestinoId('');
    setPreview(null);
    setMessage('');
    setError('');
  }, [tipo]);

  async function runPreview() {
    setLoading(true);
    setError('');
    setMessage('');
    setPreview(null);
    try {
      const response = await fetch('/api/gkit-flex/cadastros/reclassificar/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, origemCadastroId: origemId, destinoCadastroId: destinoId, motivo }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Erro ao gerar prévia.');
      setPreview(payload);
      setMessage('Prévia gerada. Confira o impacto antes de confirmar.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar prévia.');
    } finally {
      setLoading(false);
    }
  }

  async function confirm() {
    if (!preview) return;
    const ok = window.confirm(`Confirmar reclassificação de "${preview.origem.nome}" para "${preview.destino.nome}"? Essa ação atualiza ${preview.impacto.total} registro(s), inativa a origem e grava log.`);
    if (!ok) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/gkit-flex/cadastros/reclassificar/confirmar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, origemCadastroId: origemId, destinoCadastroId: destinoId, motivo }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Erro ao confirmar reclassificação.');
      setPreview(payload);
      setMessage(`Reclassificação confirmada: ${payload.totalAtualizado ?? payload.impacto?.total ?? 0} registro(s) atualizado(s).`);
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao confirmar reclassificação.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card master-data-section">
      <div className="header-row compact-header">
        <div>
          <p className="eyebrow">v14</p>
          <h2>Fusão e reclassificação segura</h2>
          <p className="muted small-text">Una nomes duplicados e reclassifique dados históricos com prévia, confirmação, aliases e log. Use quando houver categorias, centros ou carteiras repetidas por grafia.</p>
        </div>
        <StatusBadge status="aviso" label="Ação crítica" />
      </div>

      {error ? <div className="error">{error}</div> : null}
      {message ? <div className="success">{message}</div> : null}

      <div className="form-grid">
        <label className="field-label">
          Tipo
          <select className="text-input" value={tipo} onChange={(event) => setTipo(event.target.value as CadastroTipo)}>
            <option value="categoria">Categoria</option>
            <option value="centro">Centro</option>
            <option value="carteira">Carteira</option>
          </select>
        </label>
        <label className="field-label">
          Origem — nome que será fundido
          <select className="text-input" value={origemId} onChange={(event) => { setOrigemId(event.target.value); setPreview(null); }}>
            <option value="">Selecione a origem</option>
            {options.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
          </select>
        </label>
        <label className="field-label">
          Destino — nome canônico final
          <select className="text-input" value={destinoId} onChange={(event) => { setDestinoId(event.target.value); setPreview(null); }}>
            <option value="">Selecione o destino</option>
            {options.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
          </select>
        </label>
        <label className="field-label">
          Motivo da reclassificação
          <input className="text-input" value={motivo} onChange={(event) => setMotivo(event.target.value)} placeholder="Ex.: padronizar categoria duplicada" />
        </label>
      </div>

      <div className="action-row">
        <button className="secondary-button" onClick={runPreview} disabled={loading || !origemId || !destinoId || origemId === destinoId}>{loading ? 'Processando...' : 'Gerar prévia'}</button>
        <button className="primary-button" onClick={confirm} disabled={loading || !preview || preview.bloqueios.length > 0}>Confirmar reclassificação</button>
      </div>

      {preview ? (
        <div className="preview-panel">
          <div className="grid-4 dashboard-metrics">
            <MetricCard label="Tipo" value={tipoLabel(preview.tipo)} help="Cadastro afetado" />
            <MetricCard label="Origem" value={preview.origem.nome} help={`${preview.origem.aliases.length} alias(es)`} tone="warning" />
            <MetricCard label="Destino" value={preview.destino.nome} help="Nome canônico final" tone="good" />
            <MetricCard label="Impacto" value={preview.impacto.total} help="Registros que serão atualizados" tone={preview.impacto.total ? 'warning' : 'default'} />
          </div>

          {preview.bloqueios.length ? <div className="error">Bloqueios: {preview.bloqueios.join(' ')}</div> : null}
          {preview.avisos.length ? <div className="warning">Avisos: {preview.avisos.join(' ')}</div> : null}

          <div className="table-wrap">
            <table className="periods-table">
              <thead>
                <tr><th>Área impactada</th><th className="text-right">Registros</th></tr>
              </thead>
              <tbody>
                {impactRows(preview).length ? impactRows(preview).map(([label, value]) => (
                  <tr key={label}><td>{label}</td><td className="text-right"><strong>{value}</strong></td></tr>
                )) : <tr><td colSpan={2}>Nenhum registro histórico será alterado. A fusão ainda pode ser útil para alias/cadastro.</td></tr>}
              </tbody>
            </table>
          </div>

          <p className="muted small-text">Nomes reconhecidos na origem: {preview.nomesAfetados.join(', ') || '—'}.</p>
        </div>
      ) : null}
    </section>
  );
}

export function MasterDataPage() {
  const [competencia, setCompetencia] = useState(currentMonthValue());
  const [data, setData] = useState<CadastroResumo | null>(null);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/gkit-flex/cadastros/resumo');
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Erro ao carregar cadastros.');
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar cadastros.');
    } finally {
      setLoading(false);
    }
  }

  async function extract() {
    const confirmed = window.confirm('Extrair categorias, centros e carteiras a partir dos dados já salvos? Isso cria nomes canônicos e aliases, sem alterar lançamentos financeiros.');
    if (!confirmed) return;
    setExtracting(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch('/api/gkit-flex/cadastros/extrair', { method: 'POST' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Erro ao extrair cadastros.');
      setData(payload.resumo);
      setSuccess(`Extração concluída: ${payload.encontrados} nomes encontrados, ${payload.criados} criados e ${payload.atualizados} atualizados.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao extrair cadastros.');
    } finally {
      setExtracting(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const totals = data?.totais || { categorias: 0, centros: 0, carteiras: 0, aliases: 0 };

  return (
    <main className="page-shell master-data-page">
      <MonthContextHeader
        title="Cadastros e normalização"
        description="Controle nomes canônicos de categorias, centros e carteiras. Novos nomes continuam podendo nascer pela importação, mas agora podem ser fundidos com segurança."
        competencia={competencia}
        onCompetenciaChange={setCompetencia}
        primaryStatus={{ label: 'Cadastros', status: data?.configured ? 'ok' : 'indisponivel' }}
      >
        <a className="secondary-button" href="/">Voltar ao cockpit</a>
        <button className="primary-button" onClick={extract} disabled={extracting || !data?.configured}>{extracting ? 'Extraindo...' : 'Extrair dos dados'}</button>
      </MonthContextHeader>

      {error ? <div className="error">{error}</div> : null}
      {success ? <div className="success">{success}</div> : null}
      {!data?.configured ? <div className="warning">Supabase ainda não configurado. Configure o `.env.local` e rode o schema atualizado antes de usar os cadastros.</div> : null}

      <section className="grid-4 dashboard-metrics">
        <MetricCard label="Categorias" value={totals.categorias} help={plural(totals.categorias, 'nome canônico', 'nomes canônicos')} />
        <MetricCard label="Centros" value={totals.centros} help={plural(totals.centros, 'centro padronizado', 'centros padronizados')} />
        <MetricCard label="Carteiras" value={totals.carteiras} help={plural(totals.carteiras, 'carteira', 'carteiras')} />
        <MetricCard label="Aliases" value={totals.aliases} help="Nomes alternativos reconhecidos" tone={totals.aliases ? 'good' : 'default'} />
      </section>

      <section className="card">
        <div className="header-row compact-header">
          <div>
            <p className="eyebrow">Regra v14</p>
            <h2>Importação cria, reclassificação organiza</h2>
            <p className="muted">Novas despesas, categorias e carteiras continuam nascendo pelas planilhas. Quando houver duplicidade, gere uma prévia, confirme a fusão e o Flex atualiza os nomes históricos com log e aliases.</p>
          </div>
          <StatusBadge status={loading ? 'aviso' : 'ok'} label={loading ? 'Carregando' : 'Normalização'} />
        </div>
      </section>

      <ReclassificationPanel data={data} onDone={load} />

      <CadastroTable title="Categorias" description="Categorias usadas em contas a pagar e comissões." items={data?.categorias || []} />
      <CadastroTable title="Centros" description="Centros gerenciais usados no contas a pagar." items={data?.centros || []} />
      <CadastroTable title="Carteiras" description="Carteiras/vendedores usados no cálculo de comissões." items={data?.carteiras || []} />
    </main>
  );
}
