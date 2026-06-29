import Link from 'next/link'
import { updateCarteiraAction } from '@/features/admin/actions'
import { Field, PageHeader, SelectField } from '@/features/admin/components/Ui'
import { getCarteira, getCarteiraRelations, listUsuarioOptions } from '@/features/admin/queries'
import { requireAdminPermission } from '@/lib/auth/permissions'

export default async function EditarCarteiraPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPermission('admin.carteiras.write')
  const { id } = await params
  const [carteira, relations, usuarios] = await Promise.all([
    getCarteira(id),
    getCarteiraRelations(id),
    listUsuarioOptions(),
  ])

  return (
    <>
      <PageHeader title="Editar carteira" subtitle={carteira.nome} />

      <form action={updateCarteiraAction} className="card grid">
        <input type="hidden" name="id" value={carteira.id} />
        <Field label="Nome" name="nome" defaultValue={carteira.nome} required />
        <Field label="Descricao" name="descricao" defaultValue={carteira.descricao} />
        <Field label="Cor primaria" name="cor_primaria" defaultValue={carteira.cor_primaria} />
        <Field label="Logo URL" name="logo_url" defaultValue={carteira.logo_url} />

        <SelectField label="Status" name="status" defaultValue={carteira.status}>
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
          <option value="arquivado">Arquivado</option>
        </SelectField>

        <div>
          <div className="label">Colaboradores da carteira</div>
          <div className="check-list">
            {usuarios.map((usuario: any) => (
              <label key={usuario.id} className="check-row">
                <input
                  type="checkbox"
                  name="colaboradores"
                  value={usuario.id}
                  defaultChecked={relations.colaboradores.includes(usuario.id)}
                />
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
