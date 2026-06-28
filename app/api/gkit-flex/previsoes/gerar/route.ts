import { requireGkitFlexApiAccess } from '@/features/gkit-flex/api-auth';
import { seedMonthlyForecast } from '@/features/gkit-flex/previsoes/forecastPersistence';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const accessError = await requireGkitFlexApiAccess();
    if (accessError) return accessError;
    const payload = await request.json();
    const competencia = String(payload?.competencia || '');
    const tipo = ['receitas', 'pagamentos', 'tudo'].includes(String(payload?.tipo)) ? String(payload.tipo) : 'tudo';
    const data = await seedMonthlyForecast(competencia, tipo as 'receitas' | 'pagamentos' | 'tudo', Boolean(payload?.overwrite));
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao gerar previsao.' }, { status: 500 });
  }
}
