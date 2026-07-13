import { createCicloAtaAction } from '@/features/ciclo/actions'
import { CicloAtaForm, CicloSection, CicloShell } from '@/features/ciclo/components'
import { getCicloDocumentoFormData, requireCicloContext } from '@/features/ciclo/queries'

export default async function NovaAtaPage() {
  const context = await requireCicloContext()
  const formData = await getCicloDocumentoFormData(context)

  return (
    <CicloShell
      active="documentos"
      eyebrow="Documentos"
      title="Nova ata"
      description="Ata vinculada ao cliente, validade e observações operacionais."
      usuario={context.usuario}
    >
      <CicloSection
        eyebrow="Cadastro"
        title="Dados da ata"
        description="Informe cliente, tipo, assembleia, validade, status e observações."
      >
        <CicloAtaForm action={createCicloAtaAction} formData={formData} />
      </CicloSection>
    </CicloShell>
  )
}
