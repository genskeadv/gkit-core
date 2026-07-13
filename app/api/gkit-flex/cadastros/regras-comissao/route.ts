import { requireGkitFlexApiAccess } from '@/features/gkit-flex/api-auth';
import { updateCategoriaCommissionRule } from '@/features/gkit-flex/cadastros/masterDataPersistence';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const accessError = await requireGkitFlexApiAccess();
    if (accessError) return accessError;

    const payload = await request.json();
    const data = await updateCategoriaCommissionRule({
      cadastroId: String(payload?.cadastroId || ''),
      ativa: Boolean(payload?.ativa),
      matchers: Array.isArray(payload?.matchers) ? payload.matchers.map(String) : [],
      reductionPercent: Number(payload?.reductionPercent || 0),
      commissionPercent: Number(payload?.commissionPercent || 0),
      splitBy: Number(payload?.splitBy || 1),
    });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao atualizar regra de comissao.' },
      { status: 500 },
    );
  }
}
