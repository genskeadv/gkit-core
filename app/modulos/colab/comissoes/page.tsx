import { ColabCommissions, ColabShell } from '@/features/colab/components'
import { getColabData, requireColabContext } from '@/features/colab/queries'

export default async function ColabComissoesPage() {
  const context = await requireColabContext()
  const data = await getColabData(context.usuario.email)

  return (
    <ColabShell
      active="comissoes"
      title="Comissões"
      description="Resumo de comissões e valores variáveis vinculados ao Intr."
      usuario={context.usuario}
    >
      <ColabCommissions data={data} />
    </ColabShell>
  )
}
