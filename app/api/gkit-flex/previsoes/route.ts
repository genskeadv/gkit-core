import { requireGkitFlexApiAccess } from '@/features/gkit-flex/api-auth';
import { getMonthlyForecast } from '@/features/gkit-flex/previsoes/forecastPersistence';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const accessError = await requireGkitFlexApiAccess();
    if (accessError) return accessError;
    const competencia = request.nextUrl.searchParams.get('competencia');
    const data = await getMonthlyForecast(competencia);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao carregar previsoes.' }, { status: 500 });
  }
}
