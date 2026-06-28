import { requireGkitFlexApiAccess } from '@/features/gkit-flex/api-auth';
import { NextRequest } from 'next/server';
import { listPayables } from '@/features/gkit-flex/contas-pagar/payablePersistence';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const accessError = await requireGkitFlexApiAccess();
    if (accessError) return accessError;
    const competencia = request.nextUrl.searchParams.get('competencia') || '';
    const result = await listPayables(competencia);
    return Response.json(result);
  } catch (error) {
    console.error('[contas-pagar/itens][GET]', error);
    return Response.json({ error: error instanceof Error ? error.message : 'Erro ao listar pagamentos.' }, { status: 500 });
  }
}

