import Link from 'next/link'
import { canAccess } from '@/lib/auth/permissions'
import { CrmEmpresaEditableList, CrmEmpresaKpis, CrmSection, CrmShell } from '@/features/crm/components'
import { getCrmData, requireCrmContext } from '@/features/crm/queries'

export default async function CrmClientesPage() {
  const context = await requireCrmContext()
  const data = await getCrmData(context)
  const canWrite = canAccess(context.permissions, 'crm.oportunidades.write')

  return (
    <CrmShell
      active="clientes"
      eyebrow="Base cadastral"
      title="Clientes"
      description="Clientes e prospectos do CRM, com CNPJ obrigatorio, contatos compartilhados e pipeline vinculado."
      usuario={context.usuario}
      actions={canWrite ? <Link className="button" href="/modulos/crm/empresas/nova">Novo cliente</Link> : null}
    >
      <CrmSection
        eyebrow="Resumo"
        title="Base de clientes"
        description="Prospectos, clientes ativos, vinculos de contato e valor associado ao pipeline."
      >
        <CrmEmpresaKpis empresas={data.empresas} />
      </CrmSection>
      <CrmSection
        eyebrow="Cadastro"
        title="Lista de clientes"
        description="Clientes vinculados a contatos, carteiras e oportunidades comerciais."
      >
        <CrmEmpresaEditableList canWrite={canWrite} empresas={data.empresas} />
      </CrmSection>
    </CrmShell>
  )
}
