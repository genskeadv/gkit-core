import { canAccess } from '@/lib/auth/permissions'
import { GkitAteHealthNotice, GkitAteList, GkitAteSection, GkitAteShell } from '@/features/gkit-ate/components'
import { ImportarGkitAteAstreaForm } from '@/features/gkit-ate/importar-atendimentos-form'
import { getGkitAteHealth, importacaoRows, listGkitAteImportacoes, requireGkitAteContext } from '@/features/gkit-ate/queries'

export default async function GkitAteImportacoesPage() {
  const context = await requireGkitAteContext()
  const [health, importacoes] = await Promise.all([getGkitAteHealth(), listGkitAteImportacoes()])
  const canWrite = canAccess(context.permissions, 'gkit_ate.importacoes.write')

  return (
    <GkitAteShell
      active="importacoes"
      title="Importacoes"
      description="Carga de atendimentos exportados do ASTREA."
      usuario={context.usuario}
    >
      <GkitAteHealthNotice health={health} />
      {canWrite ? (
        <GkitAteSection title="Importar ASTREA" description="Use a planilha de processos/atendimentos exportada do ASTREA. Esta carga nao contem tarefas vinculadas.">
          <ImportarGkitAteAstreaForm />
        </GkitAteSection>
      ) : null}

      <GkitAteSection title="Historico" description="Ultimas cargas processadas.">
        <GkitAteList empty="Nenhuma importacao registrada." rows={importacaoRows(importacoes)} />
      </GkitAteSection>
    </GkitAteShell>
  )
}
