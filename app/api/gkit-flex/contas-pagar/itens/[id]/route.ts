import { requireGkitFlexApiAccess } from '@/features/gkit-flex/api-auth';
import { NextRequest } from 'next/server';
import { updatePayableItem } from '@/features/gkit-flex/contas-pagar/payablePersistence';

export const runtime = 'nodejs';

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const accessError = await requireGkitFlexApiAccess();
    if (accessError) return accessError;
    const { id } = await context.params;
    const payload = await request.json();
    const patch: { descricao?: string; valor_previsto?: number; categoria?: string; pago?: boolean } = {};

    if ('descricao' in payload) patch.descricao = String(payload.descricao || '');
    if ('valor_previsto' in payload) patch.valor_previsto = Number(payload.valor_previsto || 0);
    if ('categoria' in payload) patch.categoria = String(payload.categoria || '');
    if ('pago' in payload) patch.pago = Boolean(payload.pago);

    const result = await updatePayableItem(id, patch);
    return Response.json(result);
  } catch (error) {
    console.error('[contas-pagar/itens/[id]][PATCH]', error);
    return Response.json({ error: error instanceof Error ? error.message : 'Erro ao atualizar pagamento.' }, { status: 500 });
  }
}

