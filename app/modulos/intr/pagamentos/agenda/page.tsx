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
      description="Regras por tipo de pagamento que geram lançamentos individuais por colaborador."
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
        description="O valor exibido é a estimativa total; ao gerar, o sistema desmembra em pagamentos por colaborador."
        editHrefBase={canWrite ? '/modulos/intr/pagamentos/agenda' : undefined}
        empty="Nenhuma agenda de pagamento cadastrada."
        rows={rows}
      />
    </IntrShell>
  )
}
