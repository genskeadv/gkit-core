import { canAccess } from '@/lib/auth/permissions'
import { FlexList, FlexSection, FlexShell } from '@/features/flex/components'
import { listFlexTiposComissao, requireFlexContext } from '@/features/flex/queries'

export default async function FlexTiposComissaoPage() {
  const context = await requireFlexContext()
  const rows = await listFlexTiposComissao()
  const canWrite = canAccess(context.permissions, 'flex.comissoes.write')

  return (
    <FlexShell
      active="tiposComissao"
      title="Tipos de comissão"
      description="Regras percentuais que serão usadas pelo motor de comissões do Flex."
      usuario={context.usuario}
    >
      <FlexSection eyebrow="Configuração" title="Regras de comissão" description="Percentuais e vigências usados no cálculo automático.">
        <FlexList canWrite={canWrite} createHref="/modulos/flex/tipos-comissao/novo" empty="Nenhum tipo de comissão cadastrado." rows={rows} />
      </FlexSection>
    </FlexShell>
  )
}
