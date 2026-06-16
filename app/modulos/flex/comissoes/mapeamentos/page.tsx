import Link from 'next/link'
import { canAccess } from '@/lib/auth/permissions'
import { aplicarFlexMapeamentosReceitasAction } from '@/features/flex/actions'
import { FlexList, FlexSection, FlexShell } from '@/features/flex/components'
import { listFlexReceitaMapeamentos, listFlexVendedoresOmiePendentes, requireFlexContext } from '@/features/flex/queries'

export default async function FlexReceitaMapeamentosPage() {
  const context = await requireFlexContext()
  const [rows, pendentes] = await Promise.all([
    listFlexReceitaMapeamentos(),
    listFlexVendedoresOmiePendentes(),
  ])
  const canWrite = canAccess(context.permissions, 'flex.comissoes.write')

  return (
    <FlexShell
      active="comissoesMapeamentos"
      title="Mapeamento Omie"
      description="Vincule vendedores do Omie a colaboradores ou times para apurar comissões."
      usuario={context.usuario}
      actions={canWrite ? <Link className="button" href="/modulos/flex/comissoes/mapeamentos/novo">Novo mapeamento</Link> : null}
    >
      <FlexSection
        action={canWrite ? (
          <form action={aplicarFlexMapeamentosReceitasAction}>
            <button className="button secondary" type="submit">Aplicar mapeamentos</button>
          </form>
        ) : null}
        eyebrow="Omie"
        title="Vendedores pendentes"
        description="Receitas importadas com vendedor preenchido e ainda sem destino no Flex."
      >
        <FlexList rows={pendentes} empty="Nenhum vendedor Omie pendente de mapeamento." />
      </FlexSection>

      <FlexSection eyebrow="Cadastros" title="Mapeamentos ativos" description="Regras de destino usadas antes do cálculo das comissões.">
        <FlexList canWrite={canWrite} createHref="/modulos/flex/comissoes/mapeamentos/novo" rows={rows} empty="Nenhum mapeamento cadastrado." />
      </FlexSection>
    </FlexShell>
  )
}
