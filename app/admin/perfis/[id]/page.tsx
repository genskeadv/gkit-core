import Link from 'next/link'
import { updatePerfilAction } from '@/features/admin/actions'
import { Field, PageHeader, SelectField } from '@/features/admin/components/Ui'
import { getPerfil, getPerfilPermissoes, listApps, listPermissoes } from '@/features/admin/queries'
import { requireAdminPermission } from '@/lib/auth/permissions'

export default async function EditarPerfilPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPermission('admin.perfis.write')
  const { id } = await params
  const [perfil, apps, permissoes, vinculadas] = await Promise.all([
    getPerfil(id),
    listApps(),
    listPermissoes(),
    getPerfilPermissoes(id),
  ])

  return (
    <>
      <PageHeader title="Editar perfil" subtitle={`Código: ${perfil.codigo}`} />

      <form action={updatePerfilAction} className="card grid">
        <input type="hidden" name="id" value={perfil.id} />

        <div className="grid cols-2">
          <Field label="Nome" name="nome" defaultValue={perfil.nome} required />
          <Field label="Descrição" name="descricao" defaultValue={perfil.descricao} />
          <Field label="Nível" name="nivel" type="number" defaultValue={perfil.nivel} />
        </div>

        <SelectField label="Módulo" name="app_id" defaultValue={perfil.app_id}>
          <option value="">Global</option>
          {apps.map((app: any) => <option key={app.id} value={app.id}>{app.nome}</option>)}
        </SelectField>

        <SelectField label="Status" name="status" defaultValue={perfil.status}>
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
          <option value="arquivado">Arquivado</option>
        </SelectField>

        <div>
          <div className="label">Permissões</div>
          <div className="grid cols-2">
            {permissoes.map((p: any) => (
              <label key={p.id} className="checkbox-row">
                <input type="checkbox" name="permissoes" value={p.id} defaultChecked={vinculadas.includes(p.id)} />
                <span>{p.codigo}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="form-actions">
          <button className="button" type="submit">Salvar</button>
          <Link className="button secondary" href="/admin/perfis">Cancelar</Link>
        </div>
      </form>
    </>
  )
}
