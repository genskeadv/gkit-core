import { GkitNewHealthNotice, GkitNewKpis, GkitNewList, GkitNewQuickLinks, GkitNewSection, GkitNewShell } from '@/features/gkit-new/components'
import { getGkitNewDashboardData, requireGkitNewContext } from '@/features/gkit-new/queries'

export default async function GkitNewPage() {
  const context = await requireGkitNewContext()
  const data = await getGkitNewDashboardData()

  return (
    <GkitNewShell
      active="cockpit"
      title="Cockpit"
      description="Acompanhamento diário de tarefas e pendências do operador comercial."
      usuario={context.usuario}
    >
      <GkitNewHealthNotice health={data.health} />
      <GkitNewSection
        className="gkit-new-command-panel"
        title="Cockpit operacional"
        description="Indicadores e atalhos principais."
      >
        <div className="gkit-new-command-grid">
          <GkitNewKpis data={data} />
          <GkitNewQuickLinks
            items={[
              { href: '/modulos/gkit-new/clientes/novo', label: 'Base', title: 'Novo cliente', description: 'Cadastrar prospecto ou cliente por CPF/CNPJ.', meta: 'Chave única por documento' },
              { href: '/modulos/gkit-new/contatos/novo', label: 'Rede', title: 'Novo contato', description: 'Cadastrar contato e vincular a clientes.', meta: 'Relação N para N' },
              { href: '/modulos/gkit-new/oportunidades/novo', label: 'Pipeline', title: 'Nova oportunidade', description: 'Gerar workflow comercial para acompanhamento.', meta: 'Tarefas automáticas' },
              { href: '/modulos/gkit-new/base/workflow', label: 'Ritual', title: 'Workflow', description: 'Revisar tarefas padrão e prazos automáticos.', meta: 'Cadência comercial' },
            ]}
          />
        </div>
      </GkitNewSection>

      <GkitNewSection className="gkit-new-compact-panel gkit-new-task-panel" title="Tarefas do operador" description="Fila gerada pelo workflow.">
        <GkitNewList empty="Nenhuma tarefa operacional criada ainda." rows={data.tarefas} />
      </GkitNewSection>
    </GkitNewShell>
  )
}
