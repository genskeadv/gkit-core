import {
  CrmQuickLinks,
  CrmSection,
  CrmShell,
} from '@/features/crm/components'
import { requireCrmContext } from '@/features/crm/queries'

export default async function CrmPage() {
  const context = await requireCrmContext()
  const flowLinks = [
    {
      href: '/modulos/crm/contatos',
      label: '1. Contato',
      title: 'Selecionar ou cadastrar contato',
      description: 'Comece pelo relacionamento: encontre o contato existente ou cadastre um novo interlocutor.',
      meta: 'Base de contatos',
    },
    {
      href: '/modulos/crm/clientes',
      label: '2. Cliente',
      title: 'Selecionar ou cadastrar cliente',
      description: 'Vincule o contato ao cliente correto ou crie o cliente antes de seguir para a proposta.',
      meta: 'Base de clientes',
    },
    {
      href: '/modulos/crm/propostas',
      label: '3. Proposta',
      title: 'Atualizar status da proposta',
      description: 'Revise propostas em rascunho, enviadas, aprovadas, recusadas ou expiradas.',
      meta: 'Status comercial',
    },
    {
      href: '/modulos/crm/atividades',
      label: '4. Acompanhamento',
      title: 'Atualizar status do acompanhamento',
      description: 'Registre follow-ups, tarefas, reunioes e proximas acoes para manter o fluxo andando.',
      meta: 'Rotina comercial',
    },
  ]

  return (
    <CrmShell
      active="cockpit"
      eyebrow="Cockpit CRM"
      title="Fluxo comercial"
      description="Execucao diaria do CRM, organizada na ordem natural do trabalho comercial."
      usuario={context.usuario}
    >
      <CrmSection
        eyebrow="Execucao"
        title="Ordem do fluxo"
        description="Use os cards para avancar do contato ao acompanhamento, sem misturar estatisticas com operacao."
      >
        <CrmQuickLinks items={flowLinks} />
      </CrmSection>
    </CrmShell>
  )
}
