import Link from 'next/link'
import { canAccess } from '@/lib/auth/permissions'
import { FixShell } from '@/features/fix/components'
import { IntrColaboradorList, IntrKpis } from '@/features/fix/components'
import { getIntrData, requireIntrContext } from '@/features/fix/queries'

export default async function FixColaboradoresPage() {
  const context = await requireIntrContext()
  const data = await getIntrData()
  const canWrite = canAccess(context.permissions, 'intr.colaboradores.write')

  return (
    <FixShell
      active="colaboradores"
      title="Colaboradores"
      description="Cadastro executivo de pessoas integrado ao Core, com times, gestores, status e custo mensal."
      usuario={context.usuario}
      actions={canWrite ? <Link className="button" href="/modulos/fix/colaboradores/novo">Novo colaborador</Link> : null}
    >
      <IntrKpis data={data} />
      <IntrColaboradorList canWrite={canWrite} colaboradores={data.colaboradores} />
    </FixShell>
  )
}
