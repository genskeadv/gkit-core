import { requireGkitFlexApiAccess } from '@/features/gkit-flex/api-auth';
import { saveMonthlyForecast } from '@/features/gkit-flex/previsoes/forecastPersistence';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const accessError = await requireGkitFlexApiAccess();
    if (accessError) return accessError;
    const payload = await request.json();
    const competencia = String(payload?.competencia || '');
    const data = await saveMonthlyForecast(competencia, {
      receitas: Array.isArray(payload?.receitas) ? payload.receitas : [],
      pagamentos: Array.isArray(payload?.pagamentos) ? payload.pagamentos : [],
    });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao salvar previsao.' }, { status: 500 });
  }
}
