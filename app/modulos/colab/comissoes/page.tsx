import { ColabCommissions, ColabShell } from '@/features/colab/components'
import { getColabData, requireColabContext } from '@/features/colab/queries'

type ColabComissoesSearchParams = {
  competencia?: string | string[]
  status?: string | string[]
}

function firstParam(value: string | string[] | undefined, fallback = 'todos') {
  if (Array.isArray(value)) return value[0] || fallback
  return value || fallback
}

export default async function ColabComissoesPage({
  searchParams,
}: {
  searchParams?: Promise<ColabComissoesSearchParams>
}) {
  const params = await searchParams
  const context = await requireColabContext()
  const data = await getColabData(context.usuario.email)
  const statusFilter = firstParam(params?.status)
  const referenceFilter = firstParam(params?.competencia)

  return (
    <ColabShell
      active="comissoes"
      title="Comissões"
      description="Resumo de comissões e valores variáveis vinculados ao GKIT Flex."
      usuario={context.usuario}
    >
      <ColabCommissions data={data} referenceFilter={referenceFilter} statusFilter={statusFilter} />
    </ColabShell>
  )
}
