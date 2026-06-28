import { requireGkitFlexApiAccess } from '@/features/gkit-flex/api-auth';
import { NextRequest } from 'next/server';
import { exportPayablesWorkbook } from '@/features/gkit-flex/contas-pagar/payablePersistence';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const accessError = await requireGkitFlexApiAccess();
    if (accessError) return accessError;
    const competencia = request.nextUrl.searchParams.get('competencia') || '';
    const result = await exportPayablesWorkbook(competencia);

    return new Response(new Uint8Array(result.buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${result.filename}"`,
      },
    });
  } catch (error) {
    console.error('[contas-pagar/exportar][GET]', error);
    return Response.json({ error: error instanceof Error ? error.message : 'Erro ao exportar pagamentos.' }, { status: 500 });
  }
}

