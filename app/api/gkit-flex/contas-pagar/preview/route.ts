import { requireGkitFlexApiAccess } from '@/features/gkit-flex/api-auth';
import { NextRequest } from 'next/server';
import { parsePayablesWorkbook } from '@/features/gkit-flex/contas-pagar/payableProcessor';
import { previewPayablesImport } from '@/features/gkit-flex/contas-pagar/payablePersistence';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const accessError = await requireGkitFlexApiAccess();
    if (accessError) return accessError;
    const formData = await request.formData();
    const file = formData.get('contasPagar');
    const competencia = String(formData.get('competencia') || '');

    if (!(file instanceof File)) {
      return Response.json({ error: 'Envie a planilha de pagamentos.' }, { status: 400 });
    }

    const parsedRows = await parsePayablesWorkbook(file);
    const preview = await previewPayablesImport(competencia, parsedRows, file.name);
    return Response.json({ preview });
  } catch (error) {
    console.error('[contas-pagar/preview][POST]', error);
    return Response.json({ error: error instanceof Error ? error.message : 'Erro ao gerar previa de pagamentos.' }, { status: 500 });
  }
}

