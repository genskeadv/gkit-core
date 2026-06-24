import { GkitAteHealthNotice, GkitAteList, GkitAteSection, GkitAteShell } from '@/features/gkit-ate/components'
import { atendimentoRows, getGkitAteHealth, listGkitAteAtendimentos, requireGkitAteContext } from '@/features/gkit-ate/queries'

export default async function GkitAteAtendimentosPage() {
  const context = await requireGkitAteContext()
  const [health, atendimentos] = await Promise.all([getGkitAteHealth(), listGkitAteAtendimentos()])

  return (
    <GkitAteShell
      active="atendimentos"
      title="Atendimentos"
      description="Base importada do ASTREA com status, cliente, responsavel e tarefas vinculadas."
      usuario={context.usuario}
    >
      <GkitAteHealthNotice health={health} />
      <GkitAteSection title="Base ASTREA" description="Atendimentos consultivos normalizados para operacao interna.">
        <GkitAteList empty="Nenhum atendimento encontrado." rows={atendimentoRows(atendimentos)} />
      </GkitAteSection>
    </GkitAteShell>
  )
}
