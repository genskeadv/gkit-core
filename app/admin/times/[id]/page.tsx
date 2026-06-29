import Link from 'next/link'
import { updateTimeAction } from '@/features/admin/actions'
import { Field, PageHeader, SelectField } from '@/features/admin/components/Ui'
import { getTime, getTimeRelations, listUsuarioOptions } from '@/features/admin/queries'
import { requireAdminPermission } from '@/lib/auth/permissions'

export default async function EditarTimePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPermission('admin.times.write')
  const { id } = await params
  const [time, relations, usuarios] = await Promise.all([
    getTime(id),
    getTimeRelations(id),
    listUsuarioOptions(),
  ])

  return (
    <>
      <PageHeader title="Editar time" subtitle={time.nome} />

      <form action={updateTimeAction} className="card grid">
        <input type="hidden" name="id" value={time.id} />
        <Field label="Nome" name="nome" defaultValue={time.nome} required />
        <Field label="Area" name="area" defaultValue={time.area} />
        <Field label="Descricao" name="descricao" defaultValue={time.descricao} />

        <SelectField label="Status" name="status" defaultValue={time.status}>
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
          <option value="arquivado">Arquivado</option>
        </SelectField>

        <div>
          <div className="label">Colaboradores do time</div>
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
          <Link className="button secondary" href="/admin/times">Cancelar</Link>
        </div>
      </form>
    </>
  )
}
