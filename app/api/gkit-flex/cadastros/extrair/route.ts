import { requireGkitFlexApiAccess } from '@/features/gkit-flex/api-auth';
import { NextResponse } from 'next/server';
import { extractCadastrosFromOperationalData } from '@/features/gkit-flex/cadastros/masterDataPersistence';

export async function POST() {
  try {
    const accessError = await requireGkitFlexApiAccess();
    if (accessError) return accessError;
    const payload = await extractCadastrosFromOperationalData();
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao extrair cadastros.' }, { status: 500 });
  }
}
