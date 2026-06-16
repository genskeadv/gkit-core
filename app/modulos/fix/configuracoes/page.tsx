import Link from 'next/link'
import { FixShell } from '@/features/fix/components'
import { requireIntrContext } from '@/features/fix/queries'

const configuracoes = [
  {
    title: 'Categorias financeiras',
    description: 'Macrogrupos e categorias usados em extratos, contas, previsão e inteligência.',
    href: '/modulos/fix/configuracoes/categorias',
    status: 'Leitura inicial',
  },
  {
    title: 'Regras de classificação',
    description: 'Termos e prioridades do motor que classifica lançamentos importados.',
    href: '/modulos/fix/configuracoes/regras',
    status: 'Leitura inicial',
  },
  {
    title: 'Tipos de comissão',
    description: 'Regras percentuais usadas pelo motor de comissões sobre receitas importadas.',
    href: '/modulos/fix/tipos-comissao',
    status: 'Operacional',
  },
  {
    title: 'Parâmetros gerais',
    description: 'Configurações globais do fechamento e da inteligência financeira.',
    href: '/modulos/fix/configuracoes',
    status: 'Próxima etapa',
  },
]

export default async function FixConfiguracoesPage() {
  const context = await requireIntrContext()

  return (
    <FixShell
      active="configuracoes"
      title="Configurações"
      description="Cadastros técnicos que dão suporte ao financeiro, às comissões e ao fechamento."
      usuario={context.usuario}
    >
      <section className="suite-module-grid" aria-label="Configurações do FIX">
        {configuracoes.map((item) => (
          <Link className="suite-module-card" href={item.href} key={item.title}>
            <span>{item.status}</span>
            <h2>{item.title}</h2>
            <p>{item.description}</p>
            <strong>Abrir configuração</strong>
          </Link>
        ))}
      </section>
    </FixShell>
  )
}
