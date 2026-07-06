import { requireGkitFlexApiAccess } from '@/features/gkit-flex/api-auth';
import { updateCategoriaForecastAutomationRule } from '@/features/gkit-flex/cadastros/masterDataPersistence';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const accessError = await requireGkitFlexApiAccess();
    if (accessError) return accessError;

    const payload = await request.json();
    const data = await updateCategoriaForecastAutomationRule(
      String(payload?.cadastroId || ''),
      Boolean(payload?.naoGerarAutomaticamente),
    );
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao atualizar regra de previsao.' },
      { status: 500 },
    );
  }
}
