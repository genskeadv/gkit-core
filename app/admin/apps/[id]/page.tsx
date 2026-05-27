import Link from 'next/link'
import { updateAppAction } from '@/features/admin/actions'
import { Field, PageHeader, SelectField } from '@/features/admin/components/Ui'
import { getApp } from '@/features/admin/queries'
import { requireAdminPermission } from '@/lib/auth/permissions'

export default async function EditarAppPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPermission('admin.apps.write')
  const { id } = await params
  const app = await getApp(id)

  return (
    <>
      <PageHeader title="Editar módulo" subtitle={`Código protegido: ${app.codigo}`} />

      <form action={updateAppAction} className="card grid">
        <input type="hidden" name="id" value={app.id} />
        <Field label="Nome" name="nome" defaultValue={app.nome} required />
        <Field label="Descrição" name="descricao" defaultValue={app.descricao} />

        <SelectField label="Status" name="status" defaultValue={app.status}>
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
          <option value="arquivado">Arquivado</option>
        </SelectField>

        <div className="form-actions">
          <button className="button" type="submit">Salvar</button>
          <Link className="button secondary" href="/admin/apps">Cancelar</Link>
        </div>
      </form>
    </>
  )
}
