import Link from 'next/link'
import { canAccess } from '@/lib/auth/permissions'
import { gerarPagamentosPrevistosAction } from '@/features/intr/actions'
import { IntrGenericList, IntrGerarPagamentosForm, IntrListKpis, IntrShell } from '@/features/intr/components'
import { listIntrPagamentoAgendaRows, requireIntrContext } from '@/features/intr/queries'

export default async function IntrPagamentoAgendaPage() {
  const context = await requireIntrContext()
  const rows = await listIntrPagamentoAgendaRows()
  const canWrite = canAccess(context.permissions, 'intr.agenda_pagamentos.write')

  return (
    <IntrShell
      active="pagamentos"
      title="Agenda de pagamentos"
      description="Regras recorrentes por tipo de pagamento que geram pagamentos previstos por competencia."
      usuario={context.usuario}
      actions={canWrite ? (
        <>
          <Link className="button secondary" href="/modulos/intr/pagamentos">Pagamentos</Link>
          <Link className="button" href="/modulos/intr/pagamentos/agenda/nova">Nova agenda</Link>
        </>
      ) : null}
    >
      {canWrite ? <IntrGerarPagamentosForm action={gerarPagamentosPrevistosAction} /> : null}
      <IntrListKpis rows={rows} totalLabel="Agendas" />
      <IntrGenericList
        title="Regras recorrentes"
        description="Cada agenda define um tipo de pagamento e pode valer para todos os colaboradores ou para uma excecao individual."
        editHrefBase={canWrite ? '/modulos/intr/pagamentos/agenda' : undefined}
        empty="Nenhuma agenda de pagamento cadastrada."
        rows={rows}
      />
    </IntrShell>
  )
}
