import Link from 'next/link'
import { canAccess } from '@/lib/auth/permissions'
import { gerarPagamentosPrevistosAction } from '@/features/fix/actions'
import { IntrGenericList, IntrGerarPagamentosForm, IntrListKpis } from '@/features/fix/components'
import { listIntrPagamentoAgendaRows, requireIntrContext } from '@/features/fix/queries'

import { FixShell } from '@/features/fix/components'
export default async function IntrPagamentoAgendaPage() {
  const context = await requireIntrContext()
  const rows = await listIntrPagamentoAgendaRows()
  const canWrite = canAccess(context.permissions, 'intr.agenda_pagamentos.write')

  return (
    <FixShell
      active="pagamentos"
      title="Agenda de pagamentos"
      description="Regras por tipo de pagamento que geram lançamentos individuais por colaborador."
      usuario={context.usuario}
      actions={canWrite ? (
        <>
          <Link className="button secondary" href="/modulos/fix/pagamentos">Pagamentos</Link>
          <Link className="button" href="/modulos/fix/pagamentos/agenda/nova">Nova agenda</Link>
        </>
      ) : null}
    >
      {canWrite ? <IntrGerarPagamentosForm action={gerarPagamentosPrevistosAction} /> : null}
      <IntrListKpis rows={rows} totalLabel="Agendas" />
      <IntrGenericList
        title="Regras recorrentes"
        description="O valor exibido é a estimativa total; ao gerar, o sistema desmembra em pagamentos por colaborador."
        editHrefBase={canWrite ? '/modulos/fix/pagamentos/agenda' : undefined}
        empty="Nenhuma agenda de pagamento cadastrada."
        rows={rows}
      />
    </FixShell>
  )
}
