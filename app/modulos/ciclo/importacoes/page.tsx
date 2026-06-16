import Link from 'next/link'
import { canAccess } from '@/lib/auth/permissions'
import { CicloGenericList, CicloSection, CicloShell } from '@/features/ciclo/components'
import { ImportarAtendimentosAstreaForm } from '@/features/ciclo/importar-atendimentos-form'
import { ImportarClientesForm } from '@/features/ciclo/importar-clientes-form'
import { listCicloImportacaoRows, requireCicloContext } from '@/features/ciclo/queries'

type ImportacaoTab = 'clientes' | 'atendimentos'

function activeTab(value?: string): ImportacaoTab {
  return value === 'atendimentos' ? 'atendimentos' : 'clientes'
}

export default async function CicloImportacoesPage({
  searchParams,
}: {
  searchParams?: Promise<{ tipo?: string }>
}) {
  const params = await searchParams
  const tab = activeTab(params?.tipo)
  const context = await requireCicloContext()
  const rows = await listCicloImportacaoRows(context)
  const canWrite = canAccess(context.permissions, 'ciclo.clientes.write')

  return (
    <CicloShell
      active="importacoes"
      eyebrow="Dados"
      title="Importações"
      description="Histórico de cargas e processamento de dados do Ciclo."
      usuario={context.usuario}
    >
      {canWrite ? (
        <CicloSection
          eyebrow="Entrada"
          title={tab === 'clientes' ? 'Clientes' : 'Atendimentos'}
          description={tab === 'clientes'
            ? 'Importe a base de clientes do Ciclo. O CNPJ e a chave de atualizacao.'
            : 'Importe os atendimentos consultivos exportados do ASTREA.'}
          action={(
            <nav className="suite-tabs flex-import-tabs ciclo-import-tabs" aria-label="Tipo de importação">
              <Link className={tab === 'clientes' ? 'active' : ''} href="/modulos/ciclo/importacoes?tipo=clientes">Clientes</Link>
              <Link className={tab === 'atendimentos' ? 'active' : ''} href="/modulos/ciclo/importacoes?tipo=atendimentos">Atendimentos</Link>
            </nav>
          )}
        >
          <div className="flex-import-panel ciclo-import-panel">
            {tab === 'clientes' ? (
              <>
                <div className="module-inline-actions ciclo-import-actions">
                  <Link className="button secondary" href="/templates/importacao-clientes-ciclo.xlsx">Baixar template</Link>
                </div>
                <ImportarClientesForm />
              </>
            ) : (
              <ImportarAtendimentosAstreaForm />
            )}
          </div>
        </CicloSection>
      ) : null}
      <CicloSection
        eyebrow="Historico"
        title="Entradas processadas"
        description="Últimas importações realizadas no Ciclo."
      >
        <CicloGenericList
          title="Lotes processados"
          description="Arquivos processados para clientes e atendimentos."
          detailHrefBase="/modulos/ciclo/importacoes"
          emptyLabel="Nenhuma importação encontrada."
          rows={rows}
        />
      </CicloSection>
    </CicloShell>
  )
}
