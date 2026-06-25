import { requireGkitFlexApiAccess } from '@/features/gkit-flex/api-auth';
import { NextResponse } from 'next/server';
import { getCadastrosResumo } from '@/features/gkit-flex/cadastros/masterDataPersistence';

export async function GET() {
  try {
    const accessError = await requireGkitFlexApiAccess();
    if (accessError) return accessError;
    const payload = await getCadastrosResumo();
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao carregar cadastros.' }, { status: 500 });
  }
}
