import Link from 'next/link'
import { createCarteiraAction } from '@/features/admin/actions'
import { Field, PageHeader, SelectField } from '@/features/admin/components/Ui'
import { requireAdminPermission } from '@/lib/auth/permissions'

export default async function NovaCarteiraPage() {
  await requireAdminPermission('admin.carteiras.write')
  return (
    <>
      <PageHeader title="Nova carteira" subtitle="Criação de escopo operacional." />

      <form action={createCarteiraAction} className="card grid">
        <Field label="Nome" name="nome" required />
        <Field label="Descrição" name="descricao" />
        <Field label="Cor primária" name="cor_primaria" defaultValue="#351B40" />
        <Field label="Logo URL" name="logo_url" />

        <SelectField label="Status" name="status" defaultValue="ativo">
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
          <option value="arquivado">Arquivado</option>
        </SelectField>

        <div className="form-actions">
          <button className="button" type="submit">Salvar</button>
          <Link className="button secondary" href="/admin/carteiras">Cancelar</Link>
        </div>
      </form>
    </>
  )
}
