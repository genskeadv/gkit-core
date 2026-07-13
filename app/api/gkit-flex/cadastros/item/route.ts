import { requireGkitFlexApiAccess } from '@/features/gkit-flex/api-auth';
import { saveCadastroItem } from '@/features/gkit-flex/cadastros/masterDataPersistence';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const accessError = await requireGkitFlexApiAccess();
    if (accessError) return accessError;

    const payload = await request.json();
    const data = await saveCadastroItem({
      id: payload?.id ? String(payload.id) : undefined,
      tipo: payload?.tipo,
      nome: String(payload?.nome || ''),
      status: payload?.status === 'inativo' ? 'inativo' : 'ativo',
      aliases: Array.isArray(payload?.aliases) ? payload.aliases.map(String) : [],
      natureza: payload?.natureza ? String(payload.natureza) as 'receita' | 'despesa' | 'ambos' : null,
    });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao salvar cadastro.' },
      { status: 500 },
    );
  }
}
