import { requireGkitFlexApiAccess } from '@/features/gkit-flex/api-auth';
import { NextResponse } from 'next/server';
import { previewReclassification } from '@/features/gkit-flex/cadastros/reclassificationPersistence';

export async function POST(request: Request) {
  try {
    const accessError = await requireGkitFlexApiAccess();
    if (accessError) return accessError;
    const body = await request.json();
    const payload = await previewReclassification(body);
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao gerar previa da reclassificacao.' }, { status: 500 });
  }
}
