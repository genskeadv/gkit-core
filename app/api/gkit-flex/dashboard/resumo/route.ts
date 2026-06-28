import { requireGkitFlexApiAccess } from '@/features/gkit-flex/api-auth';
import { NextRequest, NextResponse } from 'next/server';
import { getDashboardSummary } from '@/features/gkit-flex/dashboard/dashboardPersistence';

export async function GET(request: NextRequest) {
  try {
    const accessError = await requireGkitFlexApiAccess();
    if (accessError) return accessError;
    const competencia = request.nextUrl.searchParams.get('competencia');
    const data = await getDashboardSummary(competencia);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao carregar resumo do mes.' }, { status: 500 });
  }
}
