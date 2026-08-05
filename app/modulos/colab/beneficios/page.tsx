import { ColabBenefits, ColabShell } from '@/features/colab/components'
import { getColabData, requireColabContext } from '@/features/colab/queries'

type ColabBeneficiosSearchParams = {
  provedor?: string | string[]
  status?: string | string[]
}

function firstParam(value: string | string[] | undefined, fallback = 'todos') {
  if (Array.isArray(value)) return value[0] || fallback
  return value || fallback
}

export default async function ColabBeneficiosPage({
  searchParams,
}: {
  searchParams?: Promise<ColabBeneficiosSearchParams>
}) {
  const params = await searchParams
  const context = await requireColabContext()
  const data = await getColabData(context.usuario.email)
  const providerFilter = firstParam(params?.provedor)
  const statusFilter = firstParam(params?.status)

  return (
    <ColabShell
      active="beneficios"
      title="Benefícios"
      description="Benefícios vinculados ao cadastro do GKIT Flex."
      usuario={context.usuario}
    >
      <ColabBenefits data={data} providerFilter={providerFilter} statusFilter={statusFilter} />
    </ColabShell>
  )
}
