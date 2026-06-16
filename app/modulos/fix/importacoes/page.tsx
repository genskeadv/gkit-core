import { canAccess } from '@/lib/auth/permissions'
import { importarFixExtratoCsvAction } from '@/features/fix/actions'
import { FixImportacoesUnificadas, FixShell } from '@/features/fix/components'
import { listFixExtratoRows, listIntrImportacaoRows, requireIntrContext } from '@/features/fix/queries'

export default async function FixImportacoesPage() {
  const context = await requireIntrContext()
  const [receitas, extratos] = await Promise.all([
    listIntrImportacaoRows(),
    listFixExtratoRows(),
  ])
  const canImportReceitas = canAccess(context.permissions, 'intr.receitas.write')
  const canImportExtratos = canAccess(context.permissions, 'intr.pagamentos.write')

  return (
    <FixShell
      active="importacoes"
      title="Importações"
      description="Receitas no padrão Omie e extratos no padrão Inter, em uma única esteira de entrada do FIX."
      usuario={context.usuario}
    >
      <FixImportacoesUnificadas
        canImportExtratos={canImportExtratos}
        canImportReceitas={canImportReceitas}
        extratoAction={importarFixExtratoCsvAction}
        extratos={extratos}
        receitas={receitas}
      />
    </FixShell>
  )
}
