import Link from 'next/link'
import { canAccess } from '@/lib/auth/permissions'
import { CrmGenericList, CrmListKpis, CrmSection, CrmShell } from '@/features/crm/components'
import { listCrmPropostaRows, requireCrmContext } from '@/features/crm/queries'

export default async function CrmPropostasPage() {
  const context = await requireCrmContext()
  const rows = await listCrmPropostaRows(context)
  const canWrite = canAccess(context.permissions, 'crm.propostas.write')

  return (
    <CrmShell
      active="propostas"
      eyebrow="Base operacional"
      title="Propostas"
      description="Controle de propostas comerciais, valores, escopo e status de aprovação."
      usuario={context.usuario}
      actions={canWrite ? <Link className="button" href="/modulos/crm/propostas/nova">Nova proposta</Link> : null}
    >
      <CrmSection
        eyebrow="Resumo"
        title="Situacao das propostas"
        description="Distribuição por volume, aprovação, atenção e risco."
      >
        <CrmListKpis rows={rows} secondaryLabel="Aprovadas" />
      </CrmSection>
      <CrmSection
        eyebrow="Operação"
        title="Lista de propostas"
        description="Propostas comerciais por status, valor e relacionamento."
      >
        <CrmGenericList
          title="Lista de propostas"
          description="Propostas existentes no schema CRM."
          editHrefBase={canWrite ? '/modulos/crm/propostas' : undefined}
          emptyLabel="Nenhuma proposta encontrada."
          rows={rows}
        />
      </CrmSection>
    </CrmShell>
  )
}
