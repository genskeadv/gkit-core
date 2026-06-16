import { FixShell, IntrGenericList, IntrListKpis } from '@/features/fix/components'
import { listFixRegraClassificacaoRows, requireIntrContext } from '@/features/fix/queries'

export default async function FixRegrasClassificacaoPage() {
  const context = await requireIntrContext()
  const rows = await listFixRegraClassificacaoRows()

  return (
    <FixShell
      active="configuracoes"
      title="Regras de classificação"
      description="Regras usadas para transformar termos do extrato em macrogrupo, categoria e confiança operacional."
      usuario={context.usuario}
    >
      <IntrListKpis rows={rows} totalLabel="Regras" />
      <IntrGenericList
        title="Regras cadastradas"
        description="Leitura inicial do motor de classificação. Alterações e criação de regras ficam para uma sprint própria."
        rows={rows}
        empty="Nenhuma regra de classificação encontrada."
      />
    </FixShell>
  )
}
