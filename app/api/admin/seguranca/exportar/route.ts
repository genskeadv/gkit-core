import { NextRequest, NextResponse } from 'next/server'
import {
  buildSecurityBackupResponse,
  loadSecurityBackup,
} from '@/features/admin/security-export'
import { requireAdminGlobal } from '@/lib/auth/require-admin-global'
import { logAdminEvent } from '@/lib/audit/log-event'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const { authUser } = await requireAdminGlobal()

  try {
    const format = request.nextUrl.searchParams.get('format') === 'csv' ? 'csv' : 'txt'
    const { payload } = await loadSecurityBackup()
    const result = buildSecurityBackupResponse(format, payload)

    await logAdminEvent({
      usuarioId: authUser.id,
      acao: 'backup_seguranca.exportado',
      descricao: `Backup de seguranca exportado em ${format.toUpperCase()}.`,
      appCodigo: 'core',
      metadata: {
        format,
        target_schemas: payload.target_schemas ?? [],
        row_counts: payload.row_counts ?? {},
      },
    })

    return new NextResponse(result.body, {
      headers: {
        'Content-Type': result.contentType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('[admin/seguranca/exportar][GET]', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Erro ao exportar backup de seguranca.',
      },
      { status: 500 },
    )
  }
}
