import { canAccess } from '@/lib/auth/permissions'
import { FlexList, FlexSection, FlexShell } from '@/features/flex/components'
import { listFlexCategorias, requireFlexContext } from '@/features/flex/queries'

export default async function FlexCategoriasPage() {
  const context = await requireFlexContext()
  const rows = await listFlexCategorias()
  const canWrite = canAccess(context.permissions, 'flex.configuracoes.write')

  return (
    <FlexShell active="categorias" title="Categorias financeiras" description="Categorias e macrogrupos do schema Flex." usuario={context.usuario}>
      <FlexSection eyebrow="Configuração" title="Categorias" description="Classificação usada em receitas, despesas e orçamento.">
        <FlexList canWrite={canWrite} createHref="/modulos/flex/configuracoes/categorias/nova" empty="Nenhuma categoria financeira cadastrada." rows={rows} />
      </FlexSection>
    </FlexShell>
  )
}
