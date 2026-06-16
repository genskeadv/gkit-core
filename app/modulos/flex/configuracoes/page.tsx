import { FlexQuickLinks, FlexSection, FlexShell } from '@/features/flex/components'
import { requireFlexContext } from '@/features/flex/queries'

const items = [
  { href: '/modulos/flex/configuracoes/categorias', title: 'Categorias financeiras', description: 'Macrogrupos para receitas, despesas, orçamento e validação.', label: 'Financeiro', meta: 'Categorias' },
  { href: '/modulos/flex/configuracoes/tipos-pagamento', title: 'Tipos de pagamento', description: 'Base dos pagamentos manuais e agendas recorrentes.', label: 'Pagamentos', meta: 'Tipos' },
  { href: '/modulos/flex/tipos-comissao', title: 'Tipos de comissão', description: 'Regras percentuais usadas no cálculo de comissões.', label: 'Comissões', meta: 'Regras' },
]

export default async function FlexConfiguracoesPage() {
  const context = await requireFlexContext()

  return (
    <FlexShell active="configuracoes" title="Configurações" description="Cadastros técnicos da fundação do Flex." usuario={context.usuario}>
      <FlexSection eyebrow="Base" title="Cadastros técnicos" description="Itens que sustentam financeiro, pagamentos e comissões.">
        <FlexQuickLinks items={items} />
      </FlexSection>
    </FlexShell>
  )
}
