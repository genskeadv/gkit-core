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
    const patch: { descricao?: string; vencimento_dia?: number | null; vencimento_texto?: string | null; valor_previsto?: number; categoria?: string; pago?: boolean; money_conta_id?: string | null; money_conta_destino_id?: string | null } = {};

    if ('descricao' in payload) patch.descricao = String(payload.descricao || '');
    if ('vencimento_dia' in payload) {
      patch.vencimento_dia = payload.vencimento_dia === null || payload.vencimento_dia === undefined || payload.vencimento_dia === '' ? null : Number(payload.vencimento_dia);
      patch.vencimento_texto = payload.vencimento_texto ? String(payload.vencimento_texto) : patch.vencimento_dia ? String(patch.vencimento_dia).padStart(2, '0') : null;
    }
    if ('valor_previsto' in payload) patch.valor_previsto = Number(payload.valor_previsto || 0);
    if ('categoria' in payload) patch.categoria = String(payload.categoria || '');
    if ('money_conta_id' in payload) patch.money_conta_id = payload.money_conta_id ? String(payload.money_conta_id) : null;
    if ('money_conta_destino_id' in payload) patch.money_conta_destino_id = payload.money_conta_destino_id ? String(payload.money_conta_destino_id) : null;
    if ('pago' in payload) patch.pago = Boolean(payload.pago);

    const result = await updatePayableItem(id, patch);
    return Response.json(result);
  } catch (error) {
    console.error('[contas-pagar/itens/[id]][PATCH]', error);
    return Response.json({ error: error instanceof Error ? error.message : 'Erro ao atualizar pagamento.' }, { status: 500 });
  }
}

