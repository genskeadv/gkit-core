import { FixGerarInteligenciaForm, IntrGenericList, IntrListKpis, FixShell } from '@/features/fix/components'
import { gerarFixPrevisaoMensalAction, gerarFixSugestoesInteligentesAction } from '@/features/fix/actions'
import { listFixInteligenciaRows, listFixPrevisaoMacrogrupoRows, requireIntrContext } from '@/features/fix/queries'

export default async function FixInteligenciaPage() {
  const context = await requireIntrContext()
  const rows = await listFixInteligenciaRows()
  const macrogrupos = await listFixPrevisaoMacrogrupoRows()

  return (
    <FixShell
      active="inteligencia"
      title="Inteligência financeira"
      description="Motor de previsão e sugestões do FIX, reaproveitando pagamentos, agendas e comissões já existentes."
      usuario={context.usuario}
    >
      <FixGerarInteligenciaForm
        gerarPrevisaoAction={gerarFixPrevisaoMensalAction}
        gerarSugestoesAction={gerarFixSugestoesInteligentesAction}
      />
      <IntrListKpis rows={rows} totalLabel="Competências" />
      <IntrGenericList
        title="Resumo por competência"
        description="Previsão consolidada, sugestões pendentes, pagamentos de colaboradores e comissões aprovadas."
        rows={rows}
        empty="Nenhuma competência processada ainda."
      />
      <IntrGenericList
        title="Previsão por macrogrupo e categoria"
        description="Agrupamento entre pessoal, infraestrutura e operacional."
        rows={macrogrupos}
        empty="Nenhuma previsão por macrogrupo calculada ainda."
      />
    </FixShell>
  )
}
