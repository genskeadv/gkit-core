import { requireGkitFlexApiAccess } from '@/features/gkit-flex/api-auth';
import { NextRequest } from 'next/server';
import { updateDashboardMonth } from '@/features/gkit-flex/dashboard/dashboardPersistence';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const accessError = await requireGkitFlexApiAccess();
    if (accessError) return accessError;
    const payload = await request.json();
    const competencia = String(payload?.competencia || '');
    const action = String(payload?.action || '');

    if (!['abrir', 'fechar', 'reabrir'].includes(action)) {
      return Response.json({ error: 'Ação inválida. Use abrir, fechar ou reabrir.' }, { status: 400 });
    }

    const result = await updateDashboardMonth(competencia, action as 'abrir' | 'fechar' | 'reabrir');
    return Response.json(result);
  } catch (error) {
    console.error('[dashboard/competencia][POST]', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Erro ao atualizar competência.' },
      { status: 500 },
    );
  }
}
