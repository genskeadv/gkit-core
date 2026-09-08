import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import {
  buildCicloDriveCatalogFilters,
  CicloDriveCatalogReview,
  CicloSection,
  CicloShell,
} from '@/features/ciclo/components'
import { getCicloDriveCatalogData, requireCicloContext } from '@/features/ciclo/queries'

type CicloDriveCatalogPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function CicloDriveCatalogPage({ searchParams }: CicloDriveCatalogPageProps) {
  const params = await searchParams
  const context = await requireCicloContext('/modulos/gkit-ciclo/documentos/drive')
  const canReadDocuments =
    canAccess(context.permissions, 'ciclo.documentos.read') ||
    canAccess(context.permissions, 'ciclo.documentos.write')

  if (!canReadDocuments) redirect('/modulos/gkit-ciclo')

  const data = await getCicloDriveCatalogData(context)
  const filters = buildCicloDriveCatalogFilters(params)

  return (
    <CicloShell
      active="documentosDrive"
      eyebrow="Documentos"
      title="Catálogo Drive"
      description="Revisão dos arquivos localizados no Drive, duplicidades e nomes fora do padrão."
      usuario={context.usuario}
    >
      <CicloSection
        className="ciclo-clientes-summary"
        eyebrow="Saneamento"
        title="Arquivos do Drive"
      >
        <CicloDriveCatalogReview data={data} filters={filters} />
      </CicloSection>
    </CicloShell>
  )
}
