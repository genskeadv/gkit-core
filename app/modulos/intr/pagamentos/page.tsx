import Link from 'next/link'
import { canAccess } from '@/lib/auth/permissions'
import { confirmarPagamentosPorTipoAction } from '@/features/intr/actions'
import { IntrConfirmarPagamentosTipoForm, IntrGenericList, IntrListKpis, IntrShell } from '@/features/intr/components'
import { getIntrFormData, listIntrPagamentoRows, requireIntrContext } from '@/features/intr/queries'

export default async function IntrPagamentosPage() {
  const context = await requireIntrContext()
  const [rows, formData] = await Promise.all([
    listIntrPagamentoRows(),
    getIntrFormData(),
  ])
  const canWrite = canAccess(context.permissions, 'intr.pagamentos.write')
  const canManageAgenda = canAccess(context.permissions, 'intr.agenda_pagamentos.write')

  return (
    <IntrShell
      active="pagamentos"
      title="Pagamentos"
      description="Pagamentos internos por colaborador, competencia, tipo e status."
      usuario={context.usuario}
      actions={canWrite || canManageAgenda ? (
        <>
          {canManageAgenda ? <Link className="button secondary" href="/modulos/intr/pagamentos/agenda">Agenda</Link> : null}
          {canWrite ? <Link className="button secondary" href="/modulos/intr/pagamentos/importacoes">Importar recibos</Link> : null}
          {canWrite ? <Link className="button" href="/modulos/intr/pagamentos/novo">Novo pagamento</Link> : null}
        </>
      ) : null}
    >
      {canWrite ? <IntrConfirmarPagamentosTipoForm action={confirmarPagamentosPorTipoAction} formData={formData} /> : null}
      <IntrListKpis rows={rows} totalLabel="Pagamentos" />
      <IntrGenericList
        title="Pagamentos recentes"
        description="Leitura da view consolidada de pagamentos da intranet."
        editHrefBase={canWrite ? '/modulos/intr/pagamentos' : undefined}
        empty="Nenhum pagamento encontrado nas views do Intr."
        rows={rows}
      />
    </IntrShell>
  )
}
