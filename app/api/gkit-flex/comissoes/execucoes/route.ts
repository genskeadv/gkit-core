import { requireGkitFlexApiAccess } from '@/features/gkit-flex/api-auth';
import { listCommissionExecutions } from '@/features/gkit-flex/comissoes/supabasePersistence';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const accessError = await requireGkitFlexApiAccess();
    if (accessError) return accessError;
    const result = await listCommissionExecutions();
    return Response.json(result);
  } catch (error) {
    console.error('[comissoes/execucoes]', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Erro ao listar execucoes.' },
      { status: 500 },
    );
  }
}
