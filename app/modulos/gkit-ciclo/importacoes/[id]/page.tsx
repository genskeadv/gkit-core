import { notFound } from 'next/navigation'
import { CicloImportacaoDetalhe, CicloSection, CicloShell } from '@/features/ciclo/components'
import { getCicloImportacaoLote, listCicloImportacaoItens, requireCicloContext } from '@/features/ciclo/queries'

export default async function CicloImportacaoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireCicloContext()
  const { id } = await params
  const [lote, itens] = await Promise.all([
    getCicloImportacaoLote(id, context),
    listCicloImportacaoItens(id, context),
  ])

  if (!lote) notFound()

  return (
    <CicloShell
      active="importacoes"
      eyebrow="Dados"
      title={lote.arquivo_nome ?? 'Importação XLSX'}
      description={`Carga ${lote.status} em ${lote.finalizado_em ? new Date(lote.finalizado_em).toLocaleString('pt-BR') : 'processamento'}.`}
      usuario={context.usuario}
    >
      <CicloSection
        eyebrow="Carga"
        title="Detalhe da importacao"
        description="Resultado do lote, linhas processadas, clientes criados e erros de carga."
      >
        <CicloImportacaoDetalhe itens={itens} lote={lote} />
      </CicloSection>
    </CicloShell>
  )
}
