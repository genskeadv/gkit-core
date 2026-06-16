import Link from 'next/link'
import { canAccess } from '@/lib/auth/permissions'
import { FlexList, FlexSection, FlexShell } from '@/features/flex/components'
import { listFlexColaboradores, requireFlexContext } from '@/features/flex/queries'

export default async function FlexColaboradoresPage() {
  const context = await requireFlexContext()
  const rows = await listFlexColaboradores()
  const canWrite = canAccess(context.permissions, 'flex.colaboradores.write')

  return (
    <FlexShell
      active="colaboradores"
      title="Colaboradores"
      description="Complementos financeiros e operacionais dos usuarios cadastrados no Core."
      usuario={context.usuario}
      actions={<Link className="button secondary" href="/modulos/flex/times">Times</Link>}
    >
      <FlexSection eyebrow="Pessoas" title="Complementos Flex" description="Dados financeiros e operacionais ligados aos usuarios do Core.">
        <FlexList
          canWrite={canWrite}
          createHref="/modulos/flex/colaboradores/novo"
          empty="Nenhum complemento de colaborador cadastrado."
          rows={rows}
        />
      </FlexSection>
    </FlexShell>
  )
}
