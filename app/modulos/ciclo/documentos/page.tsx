import Link from 'next/link'
import { canAccess } from '@/lib/auth/permissions'
import { CicloDocumentSignal, CicloDocumentoList, CicloSection, CicloShell } from '@/features/ciclo/components'
import { getCicloData, requireCicloContext } from '@/features/ciclo/queries'

export default async function CicloDocumentosPage() {
  const context = await requireCicloContext()
  const data = await getCicloData(context)
  const canWrite = canAccess(context.permissions, 'ciclo.documentos.write')

  return (
    <CicloShell
      active="documentos"
      eyebrow="Documentos"
      title="Documentos"
      description="Matriz documental unica por cliente, com status, obrigatoriedade e vencimentos."
      usuario={context.usuario}
      actions={canWrite ? <Link className="button" href="/modulos/ciclo/documentos/novo">Novo documento</Link> : null}
    >
      <CicloSection
        eyebrow="Resumo"
        title="Sinal documental"
        description="Pendencias, obrigatorios e documentos validados na base."
      >
        <CicloDocumentSignal documentos={data.documentos} />
      </CicloSection>
      <CicloSection
        eyebrow="Matriz"
        title="Documentos operacionais"
        description="Contrato, cartao CNPJ, atas, documentos do sindico, convencao, regulamento e cadastro de unidade."
      >
        <CicloDocumentoList canWrite={canWrite} documentos={data.documentos} />
      </CicloSection>
    </CicloShell>
  )
}
