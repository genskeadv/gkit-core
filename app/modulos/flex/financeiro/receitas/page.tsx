import Link from 'next/link'
import { updateFlexReceitaCategoriaLoteAction } from '@/features/flex/actions'
import { FlexList, FlexReceitaCategoriaPendenciasForm, FlexSection, FlexShell } from '@/features/flex/components'
import { getFlexFormData, listFlexReceitaCategoriaPendencias, listFlexReceitasPorCategoria, requireFlexContext } from '@/features/flex/queries'

export default async function FlexReceitasPage() {
  const context = await requireFlexContext()
  const [rows, pendencias, formData] = await Promise.all([
    listFlexReceitasPorCategoria(),
    listFlexReceitaCategoriaPendencias(),
    getFlexFormData(),
  ])

  return (
    <FlexShell
      active="receitas"
      title="Receitas"
      description="Resumo das receitas realizadas por categoria."
      usuario={context.usuario}
      actions={<Link className="button" href="/modulos/flex/financeiro/receitas/nova">Nova receita</Link>}
    >
      <FlexSection eyebrow="Entrada" title="Resumo por categoria" description="Totais consolidados para comissões, indicadores e fechamento.">
        <FlexList rows={rows} empty="Nenhuma receita categorizada." />
      </FlexSection>
      <div id="receitas-pendentes">
        <FlexSection eyebrow="Tratamento" title="Classificação por categoria" description="Aplique uma categoria Flex para todas as receitas importadas com a mesma categoria de origem.">
          <FlexReceitaCategoriaPendenciasForm action={updateFlexReceitaCategoriaLoteAction} categorias={formData.categoriasReceita} rows={pendencias} />
        </FlexSection>
      </div>
    </FlexShell>
  )
}
