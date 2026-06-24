import { GkitAteHealthNotice, GkitAteList, GkitAteSection, GkitAteShell } from '@/features/gkit-ate/components'
import { getGkitAteFormData, getGkitAteHealth, requireGkitAteContext } from '@/features/gkit-ate/queries'

export default async function GkitAteCadastrosPage() {
  const context = await requireGkitAteContext()
  const [health, formData] = await Promise.all([getGkitAteHealth(), getGkitAteFormData()])

  return (
    <GkitAteShell
      active="cadastros"
      title="Cadastros"
      description="Tipos de atendimento e tipos de tarefa usados pelo fluxo operacional."
      usuario={context.usuario}
    >
      <GkitAteHealthNotice health={health} />
      <GkitAteSection title="Tipos de atendimento" description="Quando a importacao encontra um tipo novo, ele e cadastrado automaticamente.">
        <GkitAteList
          empty="Nenhum tipo de atendimento cadastrado."
          rows={formData.atendimentoTipos.map((item) => ({
            id: item.id,
            title: item.label,
            subtitle: 'Tipo de atendimento',
            status: 'Ativo',
            value: 'ATE',
            meta: 'Cadastro operacional',
            tone: 'primary',
          }))}
        />
      </GkitAteSection>

      <GkitAteSection title="Tipos de tarefa" description="Usados para abrir a tarefa inicial e as tarefas manuais.">
        <GkitAteList
          empty="Nenhum tipo de tarefa cadastrado."
          rows={formData.tarefaTipos.map((item) => ({
            id: item.id,
            title: item.label,
            subtitle: item.descricaoPadrao ?? 'Descricao padrao',
            status: 'Ativo',
            value: 'Tarefa',
            meta: 'Cadastro operacional',
            tone: 'primary',
          }))}
        />
      </GkitAteSection>
    </GkitAteShell>
  )
}
