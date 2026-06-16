import { IntrGenericList, FixShell } from '@/features/fix/components'
import { listFixDespesaNaoClassificadaRows, listFixDespesaRealizadaRows, listFixDespesaRecorrenteRows, requireIntrContext } from '@/features/fix/queries'

export default async function FixDespesasPage() {
  const context = await requireIntrContext()
  const [rows, naoClassificadas, recorrentes] = await Promise.all([
    listFixDespesaRealizadaRows(),
    listFixDespesaNaoClassificadaRows(),
    listFixDespesaRecorrenteRows(),
  ])

  return (
    <FixShell
      active="despesas"
      title="Despesas"
      description="Saídas dos extratos, com foco em classificação e recorrência."
      usuario={context.usuario}
    >
      <section className="suite-split-grid">
        <IntrGenericList
          title="Não classificadas"
          description="Prioridade: classifique estes itens para melhorar orçamento e validação."
          rows={naoClassificadas.slice(0, 12)}
          empty="Nenhuma despesa pendente de classificação."
        />
        <IntrGenericList
          title="Recorrentes"
          description="Geradores usados para formar o orçamento dos próximos meses."
          rows={recorrentes.slice(0, 12)}
          empty="Nenhuma recorrência detectada ainda."
        />
      </section>
      <IntrGenericList
        title="Últimas despesas realizadas"
        description="Histórico recente importado dos extratos."
        rows={rows.slice(0, 20)}
        empty="Nenhuma despesa importada ainda."
      />
    </FixShell>
  )
}
