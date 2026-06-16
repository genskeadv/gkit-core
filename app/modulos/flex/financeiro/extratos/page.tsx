import Link from 'next/link'
import { FlexList, FlexSection, FlexShell } from '@/features/flex/components'
import { listFlexExtratos, requireFlexContext } from '@/features/flex/queries'

export default async function FlexExtratosPage() {
  const context = await requireFlexContext()
  const rows = await listFlexExtratos()

  return (
    <FlexShell
      active="extratos"
      title="Extratos"
      description="Extratos processados pelo Flex."
      usuario={context.usuario}
      actions={<Link className="button" href="/modulos/flex/importacoes">Registrar extrato</Link>}
    >
      <FlexSection eyebrow="Banco" title="Extratos processados" description="Arquivos e registros manuais usados para despesas e conciliação.">
        <FlexList rows={rows} empty="Nenhum extrato registrado." />
      </FlexSection>
    </FlexShell>
  )
}
