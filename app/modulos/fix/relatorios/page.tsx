import Link from 'next/link'
import { FixShell } from '@/features/fix/components'
import { requireIntrContext } from '@/features/fix/queries'

const relatorios = [
  {
    grupo: 'Financeiro',
    items: [
      { title: 'Financeiro sintético', description: 'Resumo executivo de receitas, saídas, saldo e alertas.', href: '/modulos/fix/financeiro' },
      { title: 'Financeiro detalhado', description: 'Lançamentos por extrato, categoria, macrogrupo e status.', href: '/modulos/fix/financeiro/extratos' },
      { title: 'Orçamento de despesas', description: 'Previsão orçamentária por competência, macrogrupo e categoria.', href: '/modulos/fix/financeiro/orcamento' },
      { title: 'Validação de despesas', description: 'Previsto x realizado, divergências e desvios tratados.', href: '/modulos/fix/financeiro/validacao' },
    ],
  },
  {
    grupo: 'Colaboradores',
    items: [
      { title: 'Comissões', description: 'Comissões calculadas sobre receitas importadas.', href: '/modulos/fix/comissoes' },
      { title: 'Pagamentos', description: 'Pagamentos previstos, pendentes, pagos e conciliados.', href: '/modulos/fix/pagamentos' },
      { title: 'Times', description: 'Leitura por equipe operacional e estrutura de colaboradores.', href: '/modulos/fix/times' },
    ],
  },
  {
    grupo: 'Gestão',
    items: [
      { title: 'Importações', description: 'Histórico de receitas Omie e extratos Inter.', href: '/modulos/fix/importacoes' },
      { title: 'Fechamentos', description: 'Competências abertas, em análise e fechadas.', href: '/modulos/fix/fechamentos' },
      { title: 'Configurações', description: 'Categorias, regras e parâmetros que alimentam o motor.', href: '/modulos/fix/configuracoes' },
    ],
  },
]

export default async function FixRelatoriosPage() {
  const context = await requireIntrContext()

  return (
    <FixShell
      active="relatorios"
      title="Relatórios"
      description="Central de consulta gerencial do FIX, organizada por financeiro, colaboradores e gestão."
      usuario={context.usuario}
    >
      <section className="suite-module-grid" aria-label="Relatórios do FIX">
        {relatorios.flatMap((grupo) => grupo.items.map((item) => (
          <Link className="suite-module-card" href={item.href} key={`${grupo.grupo}-${item.title}`}>
            <span>{grupo.grupo}</span>
            <h2>{item.title}</h2>
            <p>{item.description}</p>
            <strong>Abrir relatório</strong>
          </Link>
        )))}
      </section>
    </FixShell>
  )
}
