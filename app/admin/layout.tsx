import { AdminShell } from '@/features/admin/components/AdminShell'
import { requireAdminPermission } from '@/lib/auth/permissions'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { usuario, permissions } = await requireAdminPermission('admin.dashboard.read')

  return (
    <AdminShell userName={usuario.nome} userEmail={usuario.email} userRole={usuario.tipo} permissions={permissions}>
      {children}
    </AdminShell>
  )
}
