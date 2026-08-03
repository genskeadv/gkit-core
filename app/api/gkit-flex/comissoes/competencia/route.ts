import { requireGkitFlexApiAccess } from '@/features/gkit-flex/api-auth';
import { NextRequest } from 'next/server';
import { closeCommissionMonth, getCommissionMonthStatus, openCommissionMonth } from '@/features/gkit-flex/comissoes/supabasePersistence';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const accessError = await requireGkitFlexApiAccess();
    if (accessError) return accessError;
    const competencia = request.nextUrl.searchParams.get('competencia') || '';
    const result = await getCommissionMonthStatus(competencia);
    return Response.json(result);
  } catch (error) {
    console.error('[comissoes/competencia][GET]', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Erro ao consultar competência.' },
      { status: 500 },
    );
  }
}

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

    const result = action === 'fechar'
      ? await closeCommissionMonth(competencia)
      : await openCommissionMonth(competencia, action as 'abrir' | 'reabrir');

    return Response.json(result);
  } catch (error) {
    console.error('[comissoes/competencia][POST]', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Erro ao atualizar competência.' },
      { status: 500 },
    );
  }
}
