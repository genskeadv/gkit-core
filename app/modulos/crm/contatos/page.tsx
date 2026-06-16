import Link from 'next/link'
import { canAccess } from '@/lib/auth/permissions'
import { CrmGenericList, CrmListKpis, CrmSection, CrmShell } from '@/features/crm/components'
import { listCrmContatoRows, requireCrmContext } from '@/features/crm/queries'

export default async function CrmContatosPage() {
  const context = await requireCrmContext()
  const rows = await listCrmContatoRows(context)
  const canWrite = canAccess(context.permissions, 'crm.oportunidades.write')

  return (
    <CrmShell
      active="contatos"
      eyebrow="Base cadastral"
      title="Contatos"
      description="Pessoas de relacionamento comercial, com cargo, e-mail e telefone."
      usuario={context.usuario}
      actions={canWrite ? <Link className="button" href="/modulos/crm/contatos/novo">Novo contato</Link> : null}
    >
      <CrmSection
        eyebrow="Resumo"
        title="Relacionamentos ativos"
        description="Contatos disponíveis para oportunidades, atividades e interações comerciais."
      >
        <CrmListKpis rows={rows} secondaryLabel="Com cargo" />
      </CrmSection>
      <CrmSection
        eyebrow="Cadastro"
        title="Lista de contatos"
        description="Pessoas de relacionamento com cargo, e-mail, telefone e status."
      >
        <CrmGenericList
          title="Lista de contatos"
          description="Contatos carregados do CRM para apoiar pipeline e relacionamento."
          emptyLabel="Nenhum contato encontrado."
          editHrefBase={canWrite ? '/modulos/crm/contatos' : undefined}
          rows={rows}
        />
      </CrmSection>
    </CrmShell>
  )
}
