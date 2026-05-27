import Link from 'next/link'
import { createPerfilAction } from '@/features/admin/actions'
import { Field, PageHeader, SelectField } from '@/features/admin/components/Ui'
import { listApps, listPermissoes } from '@/features/admin/queries'
import { requireAdminPermission } from '@/lib/auth/permissions'

export default async function NovoPerfilPage() {
  await requireAdminPermission('admin.perfis.write')
  const apps = await listApps()
  const permissoes = await listPermissoes()

  return (
    <>
      <PageHeader title="Novo perfil" subtitle="Criação de perfil customizado." />

      <form action={createPerfilAction} className="card grid">
        <div className="grid cols-2">
          <Field label="Nome" name="nome" required />
          <Field label="Código" name="codigo" required />
          <Field label="Descrição" name="descricao" />
          <Field label="Nível" name="nivel" type="number" defaultValue={50} />
        </div>

        <SelectField label="Módulo" name="app_id">
          <option value="">Global</option>
          {apps.map((app: any) => <option key={app.id} value={app.id}>{app.nome}</option>)}
        </SelectField>

        <SelectField label="Status" name="status" defaultValue="ativo">
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
          <option value="arquivado">Arquivado</option>
        </SelectField>

        <div>
          <div className="label">Permissões</div>
          <div className="grid cols-2">
            {permissoes.map((p: any) => (
              <label key={p.id} className="checkbox-row">
                <input type="checkbox" name="permissoes" value={p.id} />
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
