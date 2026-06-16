import Link from 'next/link'
import { canAccess } from '@/lib/auth/permissions'
import { confirmarPagamentosPorTipoAction } from '@/features/fix/actions'
import { FixShell, IntrGenericList } from '@/features/fix/components'
import { IntrConfirmarPagamentosTipoForm } from '@/features/fix/components'
import { getIntrFormData, listIntrPagamentoRows, requireIntrContext } from '@/features/fix/queries'

export default async function FixPagamentosPage() {
  const context = await requireIntrContext()
  const [rows, formData] = await Promise.all([
    listIntrPagamentoRows(),
    getIntrFormData(),
  ])
  const canWrite = canAccess(context.permissions, 'intr.pagamentos.write')
  const canManageAgenda = canAccess(context.permissions, 'intr.agenda_pagamentos.write')

  return (
    <FixShell
      active="pagamentos"
      title="Pagamentos"
      description="Pagamentos internos por colaborador, competência, tipo e status."
      usuario={context.usuario}
      actions={canWrite || canManageAgenda ? (
        <>
          {canManageAgenda ? <Link className="button secondary" href="/modulos/fix/pagamentos/agenda">Agenda</Link> : null}
          {canWrite ? <Link className="button secondary" href="/modulos/fix/pagamentos/importacoes">Importar recibos</Link> : null}
          {canWrite ? <Link className="button" href="/modulos/fix/pagamentos/novo">Novo pagamento</Link> : null}
        </>
      ) : null}
    >
      {canWrite ? <IntrConfirmarPagamentosTipoForm action={confirmarPagamentosPorTipoAction} formData={formData} /> : null}
      <IntrGenericList
        title="Pagamentos"
        description="Competência, colaborador, valor e status."
        editHrefBase={canWrite ? '/modulos/fix/pagamentos' : undefined}
        empty="Nenhum pagamento encontrado nas views do Intr."
        rows={rows}
      />
    </FixShell>
  )
}
