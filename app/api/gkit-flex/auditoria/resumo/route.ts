import { requireGkitFlexApiAccess } from '@/features/gkit-flex/api-auth';
import { NextRequest, NextResponse } from 'next/server';
import { getMonthlyAudit } from '@/features/gkit-flex/auditoria/auditPersistence';

export async function GET(request: NextRequest) {
  try {
    const accessError = await requireGkitFlexApiAccess();
    if (accessError) return accessError;
    const competencia = request.nextUrl.searchParams.get('competencia');
    const data = await getMonthlyAudit(competencia);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao carregar auditoria mensal.' }, { status: 500 });
  }
}
