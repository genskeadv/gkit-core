import { requireGkitFlexApiAccess } from '@/features/gkit-flex/api-auth';
import { NextRequest } from 'next/server';
import { createManualPayableItem, listPayables } from '@/features/gkit-flex/contas-pagar/payablePersistence';

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

export async function POST(request: NextRequest) {
  try {
    const accessError = await requireGkitFlexApiAccess();
    if (accessError) return accessError;

    const payload = await request.json();
    const result = await createManualPayableItem({
      competencia: String(payload?.competencia || ''),
      descricao: String(payload?.descricao || ''),
      vencimentoDia: payload?.vencimento_dia === null || payload?.vencimento_dia === undefined || payload?.vencimento_dia === ''
        ? null
        : Number(payload.vencimento_dia),
      valorPrevisto: Number(payload?.valor_previsto || 0),
      categoria: String(payload?.categoria || ''),
      centro: String(payload?.centro || ''),
      pago: Boolean(payload?.pago),
    });

    return Response.json(result);
  } catch (error) {
    console.error('[contas-pagar/itens][POST]', error);
    return Response.json({ error: error instanceof Error ? error.message : 'Erro ao criar pagamento manual.' }, { status: 500 });
  }
}
