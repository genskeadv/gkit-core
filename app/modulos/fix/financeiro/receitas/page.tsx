import { IntrGenericList, FixShell } from '@/features/fix/components'
import { listFixReceitaRealizadaRows, requireIntrContext } from '@/features/fix/queries'

export default async function FixReceitasPage() {
  const context = await requireIntrContext()
  const rows = await listFixReceitaRealizadaRows()

  return (
    <FixShell
      active="receitas"
      title="Receitas realizadas"
      description="Receitas Omie já realizadas, usadas como base das comissões."
      usuario={context.usuario}
    >
      <IntrGenericList
        title="Receitas Omie"
        description="Competência, categoria e valor. Sem contas a receber dentro do FIX."
        rows={rows.slice(0, 30)}
        empty="Nenhuma receita Omie importada ainda."
      />
    </FixShell>
  )
}
