import Link from 'next/link';
import { EmptyState, MetricCard, StatusBadge } from '../ui/FlexUI';
import type {
  GkitFlexColaborador,
  GkitFlexColaboradorFormData,
  GkitFlexColaboradoresData,
  GkitFlexOption,
} from './types';
import { createGkitFlexColaboradorAction, updateGkitFlexColaboradorAction } from './actions';

function formatMoney(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

function statusLabel(value: string) {
  if (value === 'ativo') return 'Ativo';
  if (value === 'afastado') return 'Afastado';
  if (value === 'encerrado') return 'Encerrado';
  return 'Inativo';
}

function includesTerm(value: string | null | undefined, term: string) {
  return String(value ?? '').toLowerCase().includes(term);
}

function filterRows(rows: GkitFlexColaborador[], query: string, status: string) {
  const term = query.trim().toLowerCase();
  return rows.filter((row) => {
    const statusOk = !status || row.status === status;
    const termOk = !term || [
      row.usuario_nome,
      row.usuario_email,
      row.carteira_nome,
      row.gestor_nome,
      row.cargo_operacional,
      row.documento,
    ].some((value) => includesTerm(value, term));
    return statusOk && termOk;
  });
}

function SelectOptions({ options, placeholder }: { options: GkitFlexOption[]; placeholder: string }) {
  return (
    <>
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.detail ? `${option.label} - ${option.detail}` : option.label}
        </option>
      ))}
    </>
  );
}

function checkboxDefault(colaborador: GkitFlexColaborador | null, key: keyof GkitFlexColaborador, fallback = false) {
  if (!colaborador) return fallback;
  return Boolean(colaborador[key]);
}

export function GkitFlexColaboradoresPage({
  data,
  canWrite,
  query,
  status,
}: {
  data: GkitFlexColaboradoresData;
  canWrite: boolean;
  query: string;
  status: string;
}) {
  const rows = filterRows(data.colaboradores, query, status);

  return (
    <main className="page-shell wide-shell">
      <section className="month-context-header">
        <div className="month-context-main">
          <p className="eyebrow">GKIT Flex</p>
          <h1>Colaboradores</h1>
          <p className="muted">Cadastro financeiro dos usuarios Core que participam de pagamentos, comissoes e integracao com Colab.</p>
          <div className="month-context-statuses">
            <span>Base: <StatusBadge status="ok" label="Core" compact /></span>
            <span>Destino: <StatusBadge status="aviso" label="Colab" compact /></span>
          </div>
        </div>
        {canWrite ? (
          <div className="month-context-side">
            <Link className="primary-button" href="/modulos/gkit-flex/colaboradores/novo">Novo colaborador</Link>
          </div>
        ) : null}
      </section>

      <section className="grid-4">
        <MetricCard label="Colaboradores" value={data.resumo.total} help="com complemento Flex" />
        <MetricCard label="Ativos" value={data.resumo.ativos} help="aptos para operacao" tone={data.resumo.ativos ? 'good' : 'warning'} />
        <MetricCard label="Recebem comissao" value={data.resumo.recebemComissao} help="marcados para apuracao" />
        <MetricCard label="Custo mensal" value={formatMoney(data.resumo.custoMensal)} help="salario, beneficios e extras" />
      </section>

      <section className="card">
        <div className="header-row compact-header">
          <div>
            <p className="eyebrow">Lista</p>
            <h2>Colaboradores cadastrados</h2>
            <p className="muted small-text">Filtre por nome, e-mail, carteira, gestor, cargo ou documento.</p>
          </div>
          <form className="gkit-flex-filters" action="/modulos/gkit-flex/colaboradores">
            <label className="field-label">
              Buscar
              <input className="text-input" name="q" defaultValue={query} placeholder="Nome, carteira ou e-mail" />
            </label>
            <label className="field-label">
              Status
              <select name="status" defaultValue={status}>
                <option value="">Todos</option>
                <option value="ativo">Ativos</option>
                <option value="afastado">Afastados</option>
                <option value="inativo">Inativos</option>
                <option value="encerrado">Encerrados</option>
              </select>
            </label>
            <button className="secondary-button" type="submit">Filtrar</button>
          </form>
        </div>

        {rows.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Colaborador</th>
                  <th>Carteira</th>
                  <th>Gestor</th>
                  <th>Status</th>
                  <th className="text-right">Mensal</th>
                  <th>Recebimentos</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.usuario_nome}</strong>
                      <p className="muted small-text">{row.usuario_email || row.cargo_operacional || 'Sem e-mail'}</p>
                    </td>
                    <td>{row.carteira_nome || '-'}</td>
                    <td>{row.gestor_nome || '-'}</td>
                    <td><StatusBadge status={row.status === 'ativo' ? 'ok' : row.status === 'afastado' ? 'aviso' : 'indisponivel'} label={statusLabel(row.status)} compact /></td>
                    <td className="text-right">{formatMoney(row.total_mensal)}</td>
                    <td className="small-text muted">
                      {[
                        row.recebe_salario ? 'Salario' : '',
                        row.recebe_participacao_honorarios ? 'Honorarios' : '',
                        row.recebe_pro_labore ? 'Pro-labore' : '',
                        row.recebe_beneficios ? 'Beneficios' : '',
                        row.recebe_outros ? 'Outros' : '',
                        row.recebe_comissoes ? 'Comissoes' : '',
                      ].filter(Boolean).join(', ') || '-'}
                    </td>
                    <td className="text-right">
                      {canWrite ? <Link className="secondary-button" href={`/modulos/gkit-flex/colaboradores/${row.id}`}>Editar</Link> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Nenhum colaborador encontrado"
            description="Cadastre o complemento financeiro dos usuarios Core para destravar pagamentos, comissoes e Colab."
            action={canWrite ? <Link className="primary-button" href="/modulos/gkit-flex/colaboradores/novo">Novo colaborador</Link> : null}
          />
        )}
      </section>
    </main>
  );
}

export function GkitFlexColaboradorForm({ data }: { data: GkitFlexColaboradorFormData }) {
  const colaborador = data.colaborador;
  const action = colaborador ? updateGkitFlexColaboradorAction : createGkitFlexColaboradorAction;

  return (
    <main className="page-shell wide-shell">
      <section className="month-context-header">
        <div className="month-context-main">
          <p className="eyebrow">GKIT Flex</p>
          <h1>{colaborador ? 'Editar colaborador' : 'Novo colaborador'}</h1>
          <p className="muted">Vincule um usuario Core aos dados financeiros usados pelo Flex e pelo Colab.</p>
        </div>
        <div className="month-context-side">
          <Link className="secondary-button" href="/modulos/gkit-flex/colaboradores">Voltar</Link>
        </div>
      </section>

      <form className="card gkit-flex-form" action={action}>
        {colaborador ? <input type="hidden" name="id" value={colaborador.id} /> : null}

        <section>
          <p className="eyebrow">Identificacao</p>
          <div className="grid-3">
            <label className="field-label">
              Usuario Core
              <select name="usuario_id" defaultValue={colaborador?.usuario_id ?? ''} required>
                <SelectOptions options={data.usuarios} placeholder="Selecione" />
              </select>
            </label>
            <label className="field-label">
              Carteira
              <select name="carteira_id" defaultValue={colaborador?.carteira_id ?? ''}>
                <SelectOptions options={data.carteiras} placeholder="Sem carteira" />
              </select>
            </label>
            <label className="field-label">
              Gestor
              <select name="gestor_usuario_id" defaultValue={colaborador?.gestor_usuario_id ?? ''}>
                <SelectOptions options={data.gestores} placeholder="Sem gestor" />
              </select>
            </label>
          </div>
          <div className="grid-3">
            <label className="field-label">
              Cargo operacional
              <input className="text-input" name="cargo_operacional" defaultValue={colaborador?.cargo_operacional ?? ''} />
            </label>
            <label className="field-label">
              Documento
              <input className="text-input" name="documento" defaultValue={colaborador?.documento ?? ''} />
            </label>
            <label className="field-label">
              Telefone
              <input className="text-input" name="telefone" defaultValue={colaborador?.telefone ?? ''} />
            </label>
          </div>
        </section>

        <section>
          <p className="eyebrow">Pagamento</p>
          <div className="grid-4">
            <label className="field-label">
              Chave Pix
              <input className="text-input" name="chave_pix" defaultValue={colaborador?.chave_pix ?? ''} />
            </label>
            <label className="field-label">
              Banco
              <input className="text-input" name="banco" defaultValue={colaborador?.banco ?? ''} />
            </label>
            <label className="field-label">
              Agencia
              <input className="text-input" name="agencia" defaultValue={colaborador?.agencia ?? ''} />
            </label>
            <label className="field-label">
              Conta
              <input className="text-input" name="conta" defaultValue={colaborador?.conta ?? ''} />
            </label>
          </div>
          <div className="grid-3">
            <label className="field-label">
              Tipo de conta
              <input className="text-input" name="tipo_conta" defaultValue={colaborador?.tipo_conta ?? ''} />
            </label>
            <label className="field-label">
              Inicio
              <input className="text-input" type="date" name="data_inicio" defaultValue={colaborador?.data_inicio ?? ''} />
            </label>
            <label className="field-label">
              Status
              <select name="status" defaultValue={colaborador?.status ?? 'ativo'}>
                <option value="ativo">Ativo</option>
                <option value="afastado">Afastado</option>
                <option value="inativo">Inativo</option>
                <option value="encerrado">Encerrado</option>
              </select>
            </label>
          </div>
        </section>

        <section>
          <p className="eyebrow">Recebimentos mensais</p>
          <div className="grid-3">
            <MoneyField name="salario" label="Salario" value={colaborador?.salario} />
            <MoneyField name="participacao_honorarios" label="Participacao honorarios" value={colaborador?.participacao_honorarios} />
            <MoneyField name="pro_labore" label="Pro-labore" value={colaborador?.pro_labore} />
            <MoneyField name="ajuda_custo" label="Ajuda de custo" value={colaborador?.ajuda_custo} />
            <MoneyField name="outros_vencimentos" label="Outros vencimentos" value={colaborador?.outros_vencimentos} />
            <MoneyField name="beneficio_valor" label="Beneficios" value={colaborador?.beneficio_valor} />
          </div>
          <label className="field-label">
            Descricao dos beneficios
            <input className="text-input" name="beneficio_descricao" defaultValue={colaborador?.beneficio_descricao ?? ''} />
          </label>
        </section>

        <section>
          <p className="eyebrow">Tipos aplicaveis</p>
          <div className="gkit-flex-checks">
            <CheckField name="recebe_salario" label="Salario" defaultChecked={checkboxDefault(colaborador, 'recebe_salario')} />
            <CheckField name="recebe_participacao_honorarios" label="Honorarios" defaultChecked={checkboxDefault(colaborador, 'recebe_participacao_honorarios')} />
            <CheckField name="recebe_pro_labore" label="Pro-labore" defaultChecked={checkboxDefault(colaborador, 'recebe_pro_labore')} />
            <CheckField name="recebe_beneficios" label="Beneficios" defaultChecked={checkboxDefault(colaborador, 'recebe_beneficios')} />
            <CheckField name="recebe_outros" label="Outros" defaultChecked={checkboxDefault(colaborador, 'recebe_outros')} />
            <CheckField name="recebe_comissoes" label="Comissoes" defaultChecked={checkboxDefault(colaborador, 'recebe_comissoes', true)} />
          </div>
        </section>

        <label className="field-label">
          Observacoes
          <textarea name="observacoes" rows={4} defaultValue={colaborador?.observacoes ?? ''} />
        </label>

        <div className="actions">
          <Link className="secondary-button" href="/modulos/gkit-flex/colaboradores">Cancelar</Link>
          <button className="primary-button" type="submit">{colaborador ? 'Salvar colaborador' : 'Criar colaborador'}</button>
        </div>
      </form>
    </main>
  );
}

function MoneyField({ name, label, value }: { name: string; label: string; value?: number }) {
  return (
    <label className="field-label">
      {label}
      <input className="text-input" name={name} type="number" min="0" step="0.01" defaultValue={value ?? 0} />
    </label>
  );
}

function CheckField({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="gkit-flex-check">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} />
      <span>{label}</span>
    </label>
  );
}
