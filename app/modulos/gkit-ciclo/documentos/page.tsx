import Link from 'next/link'
import { canAccess } from '@/lib/auth/permissions'
import { CicloDocumentSignal, CicloDocumentoList, CicloSection, CicloShell } from '@/features/ciclo/components'
import { getCicloData, requireCicloContext } from '@/features/ciclo/queries'

type CicloDocumentosPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function singleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? ''
}

function dateParam(value: string | string[] | undefined) {
  const date = singleParam(value)
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : ''
}

export default async function CicloDocumentosPage({ searchParams }: CicloDocumentosPageProps) {
  const params = await searchParams
  const context = await requireCicloContext()
  const data = await getCicloData(context)
  const canWrite = canAccess(context.permissions, 'ciclo.documentos.write')
  const filters = {
    ate: dateParam(params?.ate),
    de: dateParam(params?.de),
    status: singleParam(params?.status),
    tipo: singleParam(params?.tipo),
  }

  return (
    <CicloShell
      active="documentos"
      eyebrow="Documentos"
      title="Documentos"
      description="Matriz documental única por cliente, com status, obrigatoriedade e vencimentos."
      usuario={context.usuario}
      actions={canWrite ? <Link className="button" href="/modulos/gkit-ciclo/documentos/novo">Novo documento</Link> : null}
    >
      <CicloSection
        eyebrow="Resumo"
        title="Sinal documental"
        description="Pendências, obrigatórios e documentos validados na base."
      >
        <CicloDocumentSignal documentos={data.documentos} />
      </CicloSection>
      <CicloSection
        eyebrow="Matriz"
        title="Documentos operacionais"
        description="Contrato, cartão CNPJ, atas, documentos do síndico, convenção, regulamento e cadastro de unidade."
      >
        <CicloDocumentoList canWrite={canWrite} documentos={data.documentos} filters={filters} />
      </CicloSection>
    </CicloShell>
  )
}
