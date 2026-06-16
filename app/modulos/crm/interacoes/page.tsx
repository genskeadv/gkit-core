import Link from 'next/link'
import { canAccess } from '@/lib/auth/permissions'
import { CrmGenericList, CrmListKpis, CrmSection, CrmShell } from '@/features/crm/components'
import { listCrmInteracaoRows, requireCrmContext } from '@/features/crm/queries'

export default async function CrmInteracoesPage() {
  const context = await requireCrmContext()
  const rows = await listCrmInteracaoRows(context)
  const canWrite = canAccess(context.permissions, 'crm.oportunidades.write')

  return (
    <CrmShell
      active="interacoes"
      eyebrow="Base operacional"
      title="Interações"
      description="Historico de contatos, reunioes, mensagens e relacionamento comercial."
      usuario={context.usuario}
      actions={canWrite ? <Link className="button" href="/modulos/crm/interacoes/nova">Nova interação</Link> : null}
    >
      <CrmSection
        eyebrow="Resumo"
        title="Relacionamento registrado"
        description="Volume e qualidade dos contatos comerciais carregados no CRM."
      >
        <CrmListKpis rows={rows} secondaryLabel="Registradas" />
      </CrmSection>
      <CrmSection
        eyebrow="Historico"
        title="Linha de interações"
        description="Contatos, reunioes e mensagens por cliente, oportunidade e canal."
      >
        <CrmGenericList
          title="Histórico de interações"
          description="Linha de relacionamento por cliente, oportunidade e canal."
          editHrefBase={canWrite ? '/modulos/crm/interacoes' : undefined}
          emptyLabel="Nenhuma interação encontrada."
          rows={rows}
        />
      </CrmSection>
    </CrmShell>
  )
}
