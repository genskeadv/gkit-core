import { requireGkitFlexApiAccess } from '@/features/gkit-flex/api-auth';
import { NextRequest } from 'next/server';
import { classifyPayableSanitization, listPayableSanitization } from '@/features/gkit-flex/contas-pagar/payablePersistence';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const accessError = await requireGkitFlexApiAccess();
    if (accessError) return accessError;
    const competencia = request.nextUrl.searchParams.get('competencia') || '';
    const result = await listPayableSanitization(competencia);
    return Response.json(result);
  } catch (error) {
    console.error('[contas-pagar/saneamento][GET]', error);
    return Response.json({ error: error instanceof Error ? error.message : 'Erro ao carregar saneamento de pagamentos.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const accessError = await requireGkitFlexApiAccess();
    if (accessError) return accessError;
    const payload = await request.json();
    const field = String(payload.field || payload.campo || 'categoria') === 'centro' ? 'centro' : 'categoria';
    const result = await classifyPayableSanitization(
      String(payload.competencia || ''),
      Array.isArray(payload.ids) ? payload.ids : [],
      field,
      String(payload.value || payload.valor || payload.categoria || ''),
    );
    return Response.json(result);
  } catch (error) {
    console.error('[contas-pagar/saneamento][PATCH]', error);
    return Response.json({ error: error instanceof Error ? error.message : 'Erro ao classificar pagamentos.' }, { status: 500 });
  }
}
