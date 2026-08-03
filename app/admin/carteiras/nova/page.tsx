import Link from 'next/link'
import { createCarteiraAction } from '@/features/admin/actions'
import { Field, PageHeader, SelectField } from '@/features/admin/components/Ui'
import { listUsuarioOptions } from '@/features/admin/queries'
import { requireAdminPermission } from '@/lib/auth/permissions'

export default async function NovaCarteiraPage() {
  await requireAdminPermission('admin.carteiras.write')
  const usuarios = await listUsuarioOptions()

  return (
    <>
      <PageHeader title="Nova carteira" subtitle="Grupo de clientes, receita e colaboradores responsáveis." />

      <form action={createCarteiraAction} className="card grid">
        <Field label="Nome" name="nome" required />
        <Field label="Descrição" name="descricao" />
        <Field label="Cor primaria" name="cor_primaria" defaultValue="#351B40" />
        <Field label="Logo URL" name="logo_url" />

        <SelectField label="Status" name="status" defaultValue="ativo">
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
          <option value="arquivado">Arquivado</option>
        </SelectField>

        <div>
          <div className="label">Colaboradores da carteira</div>
          <div className="check-list">
            {usuarios.map((usuario: any) => (
              <label key={usuario.id} className="check-row">
                <input type="checkbox" name="colaboradores" value={usuario.id} />
                <span>{usuario.nome} <small>{usuario.email}</small></span>
              </label>
            ))}
          </div>
        </div>

        <div className="form-actions">
          <button className="button" type="submit">Salvar</button>
          <Link className="button secondary" href="/admin/carteiras">Cancelar</Link>
        </div>
      </form>
    </>
  )
}
