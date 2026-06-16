import Link from 'next/link'
import { canAccess } from '@/lib/auth/permissions'
import { importarFlexExtratoOfxAction, importarFlexReceitasOmieAction, previewFlexExtratoOfxAction, previewFlexReceitasOmieAction } from '@/features/flex/actions'
import { FlexList, FlexSection, FlexShell } from '@/features/flex/components'
import { FlexImportPreviewForm } from '@/features/flex/import-preview-form'
import { listFlexImportacoes, requireFlexContext } from '@/features/flex/queries'

type ImportacaoTab = 'receitas' | 'despesas'

function activeTab(value?: string): ImportacaoTab {
  return value === 'despesas' ? 'despesas' : 'receitas'
}

export default async function FlexImportacoesPage({
  searchParams,
}: {
  searchParams?: Promise<{ tipo?: string }>
}) {
  const params = await searchParams
  const tab = activeTab(params?.tipo)
  const context = await requireFlexContext()
  const rows = await listFlexImportacoes()
  const canWrite = canAccess(context.permissions, 'flex.importacoes.write')

  return (
    <FlexShell
      active="importacoes"
      title="Importações"
      description="Entrada estruturada de receitas Omie e extratos Banco Inter no Flex."
      usuario={context.usuario}
    >
      {canWrite ? (
        <FlexSection
          eyebrow="Entrada"
          title={tab === 'receitas' ? 'Receitas' : 'Despesas'}
          description={tab === 'receitas' ? 'Importe o arquivo Omie de receitas.' : 'Importe o OFX do Banco Inter com as saídas do mês.'}
          action={(
            <nav className="suite-tabs flex-import-tabs" aria-label="Tipo de importação">
              <Link className={tab === 'receitas' ? 'active' : ''} href="/modulos/flex/importacoes?tipo=receitas">Receitas</Link>
              <Link className={tab === 'despesas' ? 'active' : ''} href="/modulos/flex/importacoes?tipo=despesas">Despesas</Link>
            </nav>
          )}
        >
          <div className="flex-import-panel">
            {tab === 'receitas' ? (
              <FlexImportPreviewForm
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                description="Planilha Financas - Movimentacao da Conta Corrente exportada do Omie."
                importAction={importarFlexReceitasOmieAction}
                importLabel="Importar receitas"
                inputLabel="Arquivo XLSX"
                previewAction={previewFlexReceitasOmieAction}
                title="Importar receitas Omie"
              />
            ) : (
              <FlexImportPreviewForm
                accept=".ofx,application/x-ofx,application/vnd.intu.qfx"
                description="Extrato Banco Inter com lançamentos, datas, valores e chave FITID."
                importAction={importarFlexExtratoOfxAction}
                importLabel="Importar extrato"
                inputLabel="Arquivo OFX"
                previewAction={previewFlexExtratoOfxAction}
                title="Importar OFX"
              />
            )}
          </div>
        </FlexSection>
      ) : null}
      <FlexSection eyebrow="Histórico" title="Entradas processadas" description="Últimas importações realizadas no Flex.">
        <FlexList rows={rows} empty="Nenhuma importação registrada." />
      </FlexSection>
    </FlexShell>
  )
}
