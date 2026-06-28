import { requireGkitFlexApiAccess } from '@/features/gkit-flex/api-auth';
import { NextRequest } from 'next/server';
import { closePayableMonthAndCreateNext } from '@/features/gkit-flex/contas-pagar/payablePersistence';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const accessError = await requireGkitFlexApiAccess();
    if (accessError) return accessError;
    const payload = await request.json();
    const competencia = String(payload?.competencia || '');
    const result = await closePayableMonthAndCreateNext(competencia);
    return Response.json(result);
  } catch (error) {
    console.error('[contas-pagar/fechar][POST]', error);
    return Response.json({ error: error instanceof Error ? error.message : 'Erro ao fechar pagamentos.' }, { status: 500 });
  }
}

