import { requireGkitFlexApiAccess } from '@/features/gkit-flex/api-auth';
import { NextRequest } from 'next/server';
import { getPayableMonthStatus, openPayableMonth } from '@/features/gkit-flex/contas-pagar/payablePersistence';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const accessError = await requireGkitFlexApiAccess();
    if (accessError) return accessError;
    const competencia = request.nextUrl.searchParams.get('competencia') || '';
    const result = await getPayableMonthStatus(competencia);
    return Response.json(result);
  } catch (error) {
    console.error('[contas-pagar/competencia][GET]', error);
    return Response.json({ error: error instanceof Error ? error.message : 'Erro ao consultar competência.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const accessError = await requireGkitFlexApiAccess();
    if (accessError) return accessError;
    const payload = await request.json();
    const competencia = String(payload?.competencia || '');
    const action = String(payload?.action || 'abrir');

    if (!['abrir', 'reabrir'].includes(action)) {
      return Response.json({ error: 'Ação inválida. Use abrir ou reabrir. O fechamento usa /api/gkit-flex/contas-pagar/fechar.' }, { status: 400 });
    }

    const result = await openPayableMonth(competencia, action as 'abrir' | 'reabrir');
    return Response.json(result);
  } catch (error) {
    console.error('[contas-pagar/competencia][POST]', error);
    return Response.json({ error: error instanceof Error ? error.message : 'Erro ao atualizar competência.' }, { status: 500 });
  }
}
