import { requireGkitFlexApiAccess } from '@/features/gkit-flex/api-auth';
import { NextRequest, NextResponse } from 'next/server';
import { buildMonthlyClosingWorkbook } from '@/features/gkit-flex/auditoria/auditPersistence';

export async function GET(request: NextRequest) {
  try {
    const accessError = await requireGkitFlexApiAccess();
    if (accessError) return accessError;
    const competencia = request.nextUrl.searchParams.get('competencia');
    const result = await buildMonthlyClosingWorkbook(competencia);
    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${result.filename}"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao exportar fechamento mensal.' }, { status: 500 });
  }
}
