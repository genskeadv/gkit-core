import Link from 'next/link'
import { IntrGenericList, IntrListKpis, FixShell } from '@/features/fix/components'
import { listFixExtratoRows, requireIntrContext } from '@/features/fix/queries'

export default async function FixExtratosPage() {
  const context = await requireIntrContext()
  const rows = await listFixExtratoRows()

  return (
    <FixShell
      active="extratos"
      title="Extratos"
      description="Histórico dos extratos Inter processados para conciliação e inteligência financeira."
      usuario={context.usuario}
      actions={<Link className="button" href="/modulos/fix/importacoes">Importar extrato</Link>}
    >
      <IntrListKpis rows={rows} totalLabel="Extratos" />
      <IntrGenericList
        title="Extratos importados"
        description="Arquivos processados pelo FIX. A importação fica centralizada em Importações."
        rows={rows}
        empty="Nenhum extrato importado."
        editHrefBase="/modulos/fix/financeiro/extratos"
      />
    </FixShell>
  )
}
