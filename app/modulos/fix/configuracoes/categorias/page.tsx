import { FixShell, IntrGenericList, IntrListKpis } from '@/features/fix/components'
import { listFixCategoriaFinanceiraRows, requireIntrContext } from '@/features/fix/queries'

export default async function FixCategoriasFinanceirasPage() {
  const context = await requireIntrContext()
  const rows = await listFixCategoriaFinanceiraRows()

  return (
    <FixShell
      active="configuracoes"
      title="Categorias financeiras"
      description="Categorias e macrogrupos usados pelo FIX para classificar saídas, previsões e sugestões."
      usuario={context.usuario}
    >
      <IntrListKpis rows={rows} totalLabel="Categorias" />
      <IntrGenericList
        title="Categorias cadastradas"
        description="Leitura inicial das categorias já existentes no schema gkli_intr. O CRUD fica para a próxima etapa."
        rows={rows}
        empty="Nenhuma categoria financeira encontrada."
      />
    </FixShell>
  )
}
