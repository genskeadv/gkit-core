import {
  CicloQuickLinks,
  CicloSection,
  CicloShell,
} from '@/features/ciclo/components'
import { requireCicloContext } from '@/features/ciclo/queries'

export default async function CicloPage() {
  const context = await requireCicloContext()
  const flowLinks = [
    {
      href: '/modulos/ciclo/importacoes',
      label: '1. Entrada',
      title: 'Importar ou revisar base',
      description: 'Carregue novos dados e confira se os registros de entrada foram processados corretamente.',
      meta: 'Origem operacional',
    },
    {
      href: '/modulos/ciclo/clientes',
      label: '2. Cliente',
      title: 'Selecionar ou cadastrar cliente',
      description: 'Abra o cliente da carteira ou cadastre um novo registro antes de seguir a rotina.',
      meta: 'Cadastro mestre',
    },
    {
      href: '/modulos/ciclo/documentos',
      label: '3. Regularidade',
      title: 'Atualizar status documental',
      description: 'Revise documentos pendentes, recebidos, validados, vencidos ou dispensados.',
      meta: 'Checklist documental',
    },
    {
      href: '/modulos/ciclo/alertas',
      label: '4. Acompanhamento',
      title: 'Atualizar status do acompanhamento',
      description: 'Trate alertas, riscos, prazos e ocorrencias que precisam de acao operacional.',
      meta: 'Fila diaria',
    },
  ]

  return (
    <CicloShell
      active="cockpit"
      eyebrow="GKIT Ciclo"
      title="Fluxo operacional"
      description="Execucao diaria do Ciclo, organizada na ordem natural da rotina de acompanhamento."
      usuario={context.usuario}
    >
      <CicloSection
        className="ciclo-command-panel"
        eyebrow="Execucao"
        title="Ordem do fluxo"
        description="Use os cards para avancar pela rotina operacional; indicadores ficam no dashboard."
      >
        <CicloQuickLinks items={flowLinks} />
      </CicloSection>
    </CicloShell>
  )
}
