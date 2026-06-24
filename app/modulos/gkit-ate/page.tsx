import { GkitAteHealthNotice, GkitAteKpis, GkitAteList, GkitAteQuickLinks, GkitAteSection, GkitAteShell } from '@/features/gkit-ate/components'
import { getGkitAteDashboardData, requireGkitAteContext } from '@/features/gkit-ate/queries'

export default async function GkitAtePage() {
  const context = await requireGkitAteContext()
  const data = await getGkitAteDashboardData()

  return (
    <GkitAteShell
      active="cockpit"
      title="Cockpit"
      description="Atendimentos consultivos importados do ASTREA e tarefas vinculadas."
      usuario={context.usuario}
    >
      <GkitAteHealthNotice health={data.health} />
      <GkitAteSection title="Visao operacional" description="Fila de atendimentos, responsaveis e pendencias.">
        <div className="gkit-new-command-grid">
          <GkitAteKpis data={data} />
          <GkitAteQuickLinks
            items={[
              { href: '/modulos/gkit-ate/importacoes', label: 'ASTREA', title: 'Importar planilha', description: 'Carregar exportacao de processos/atendimentos.', meta: 'Tarefas ficam em tabela separada' },
              { href: '/modulos/gkit-ate/atendimentos', label: 'Fila', title: 'Atendimentos', description: 'Consultar base importada e abrir detalhes.', meta: '1 atendimento para N tarefas' },
              { href: '/modulos/gkit-ate/tarefas', label: 'Agenda', title: 'Tarefas', description: 'Acompanhar tarefas vinculadas aos atendimentos.', meta: 'Manual ou futura importacao' },
            ]}
          />
        </div>
      </GkitAteSection>

      <GkitAteSection title="Atendimentos recentes" description="Ultimos registros importados do ASTREA.">
        <GkitAteList empty="Nenhum atendimento importado ainda." rows={data.atendimentos} />
      </GkitAteSection>

      <GkitAteSection title="Tarefas pendentes" description="Pendencias ligadas aos atendimentos.">
        <GkitAteList empty="Nenhuma tarefa pendente." rows={data.tarefas} />
      </GkitAteSection>

      <GkitAteSection title="Responsaveis" description="Distribuicao dos atendimentos por responsavel.">
        <GkitAteList empty="Sem responsaveis importados ainda." rows={data.porResponsavel} />
      </GkitAteSection>
    </GkitAteShell>
  )
}
