import { requireGkitFlexApiAccess } from '@/features/gkit-flex/api-auth';
import { getDashboardPeriods } from '@/features/gkit-flex/dashboard/dashboardPersistence';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const accessError = await requireGkitFlexApiAccess();
    if (accessError) return accessError;
    const result = await getDashboardPeriods();
    return Response.json(result);
  } catch (error) {
    console.error('[dashboard/periodos][GET]', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Erro ao listar períodos.' },
      { status: 500 },
    );
  }
}
