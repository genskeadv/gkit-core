import Link from 'next/link'
import { createTimeAction } from '@/features/admin/actions'
import { Field, PageHeader, SelectField } from '@/features/admin/components/Ui'
import { listUsuarioOptions } from '@/features/admin/queries'
import { requireAdminPermission } from '@/lib/auth/permissions'

export default async function NovoTimePage() {
  await requireAdminPermission('admin.times.write')
  const usuarios = await listUsuarioOptions()

  return (
    <>
      <PageHeader title="Novo time" subtitle="Crie um grupo organizacional de colaboradores." />

      <form action={createTimeAction} className="card grid">
        <Field label="Nome" name="nome" required />
        <Field label="Area" name="area" />
        <Field label="Descricao" name="descricao" />

        <SelectField label="Status" name="status" defaultValue="ativo">
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
          <option value="arquivado">Arquivado</option>
        </SelectField>

        <div>
          <div className="label">Colaboradores do time</div>
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
          <Link className="button secondary" href="/admin/times">Cancelar</Link>
        </div>
      </form>
    </>
  )
}
