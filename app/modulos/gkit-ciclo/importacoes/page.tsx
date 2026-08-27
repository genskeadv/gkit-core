import Link from 'next/link'
import { canAccess } from '@/lib/auth/permissions'
import { moduleTarget } from '@/lib/auth/platform'
import { buildCicloListFilters, CicloGenericList, CicloSection, CicloShell } from '@/features/ciclo/components'
import { ImportarAtendimentosAstreaForm } from '@/features/ciclo/importar-atendimentos-form'
import { ImportarClientesForm } from '@/features/ciclo/importar-clientes-form'
import { ImportarReceitasForm } from '@/features/ciclo/importar-receitas-form'
import { listCicloImportacaoRows, requireCicloContext } from '@/features/ciclo/queries'

type ImportacaoTab = 'clientes' | 'atendimentos' | 'receitas'

function activeTab(value?: string): ImportacaoTab {
  if (value === 'receitas') return 'receitas'
  return value === 'atendimentos' ? 'atendimentos' : 'clientes'
}

function tabTitle(tab: ImportacaoTab) {
  if (tab === 'atendimentos') return 'Atendimentos'
  if (tab === 'receitas') return 'Receitas'
  return 'Clientes'
}

function tabDescription(tab: ImportacaoTab) {
  if (tab === 'atendimentos') return 'Importe os atendimentos consultivos exportados do ASTREA.'
  if (tab === 'receitas') return 'Importe a receita mensal para alimentar a regularidade e a pontualidade dos clientes.'
  return 'Importe a base de clientes do Ciclo. O CNPJ é a chave de atualização.'
}

export default async function CicloImportacoesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const requestedTab = activeTab(Array.isArray(params?.tipo) ? params?.tipo[0] : params?.tipo)
  const context = await requireCicloContext(moduleTarget('/modulos/gkit-ciclo/importacoes', params))
  const rows = await listCicloImportacaoRows(context)
  const canWrite = canAccess(context.permissions, 'ciclo.clientes.write')
  const canImportReceitas = canAccess(context.permissions, 'gkit_flex.comissoes.write')
  const canManageImportacoes = canWrite || canImportReceitas
  const tab = requestedTab === 'receitas'
    ? (canImportReceitas ? requestedTab : 'clientes')
    : (canWrite ? requestedTab : 'receitas')

  return (
    <CicloShell
      active="importacoes"
      eyebrow="Dados"
      title="Importações"
      description="Histórico de cargas e processamento de dados do Ciclo."
      usuario={context.usuario}
    >
      {canManageImportacoes ? (
        <CicloSection
          eyebrow="Entrada"
          title={tabTitle(tab)}
          description={tabDescription(tab)}
          action={(
            <nav className="suite-tabs flex-import-tabs ciclo-import-tabs" aria-label="Tipo de importação">
              {canWrite ? <Link className={tab === 'clientes' ? 'active' : ''} href="/modulos/gkit-ciclo/importacoes?tipo=clientes">Clientes</Link> : null}
              {canWrite ? <Link className={tab === 'atendimentos' ? 'active' : ''} href="/modulos/gkit-ciclo/importacoes?tipo=atendimentos">Atendimentos</Link> : null}
              {canImportReceitas ? <Link className={tab === 'receitas' ? 'active' : ''} href="/modulos/gkit-ciclo/importacoes?tipo=receitas">Receitas</Link> : null}
            </nav>
          )}
        >
          <div className="flex-import-panel ciclo-import-panel">
            {tab === 'receitas' && canImportReceitas ? (
              <ImportarReceitasForm />
            ) : tab === 'clientes' && canWrite ? (
              <>
                <div className="module-inline-actions ciclo-import-actions">
                  <Link className="button secondary" href="/templates/importacao-clientes-ciclo.xlsx">Baixar template</Link>
                </div>
                <ImportarClientesForm />
              </>
            ) : tab === 'atendimentos' && canWrite ? (
              <ImportarAtendimentosAstreaForm />
            ) : (
              <div className="suite-empty-block warning">Você não tem permissão para esta importação.</div>
            )}
          </div>
        </CicloSection>
      ) : null}
      <CicloSection
        eyebrow="Historico"
        hideHeader
        title="Entradas processadas"
        description="Últimas importações realizadas no Ciclo."
      >
        <CicloGenericList
          title="Lotes processados"
          description="Arquivos processados para clientes e atendimentos."
          detailHrefBase="/modulos/gkit-ciclo/importacoes"
          emptyLabel="Nenhuma importação encontrada."
          filters={buildCicloListFilters(params)}
          hiddenInputs={{ tipo: tab }}
          rows={rows}
        />
      </CicloSection>
    </CicloShell>
  )
}
