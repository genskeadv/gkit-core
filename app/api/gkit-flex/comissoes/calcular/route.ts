import { requireGkitFlexApiAccess } from '@/features/gkit-flex/api-auth';
import { NextRequest } from 'next/server';
import { getCicloClientesForComissoes } from '@/features/gkit-flex/ciclo-clientes';
import { buildCommissionWorkbook, processCommissionWithClients } from '@/features/gkit-flex/comissoes/commissionProcessor';
import { saveCommissionExecution } from '@/features/gkit-flex/comissoes/supabasePersistence';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const accessError = await requireGkitFlexApiAccess();
    if (accessError) return accessError;
    const formData = await request.formData();
    const contasFile = formData.get('contasReceber');
    const competencia = String(formData.get('competencia') || '');

    if (!(contasFile instanceof File)) {
      return Response.json(
        { error: 'Envie o arquivo de contas a receber.' },
        { status: 400 },
      );
    }

    const contasBuffer = await contasFile.arrayBuffer();
    const clientesCiclo = await getCicloClientesForComissoes();

    const result = processCommissionWithClients(contasBuffer, clientesCiclo);
    const saveResult = await saveCommissionExecution({
      competencia,
      contasFileName: contasFile.name,
      clientesFileName: 'ciclo.clientes',
      result,
    });

    const output = buildCommissionWorkbook(result);

    const resumo = result.summaries.map((row) => ({
      categoria: row.categoria,
      carteira: row.carteira,
      quantidadeLancamentos: row.quantidadeLancamentos,
      valorRecebido: row.valorRecebido,
      valorAposReducao: row.valorAposReducao,
      comissaoFinal: row.comissaoFinal,
    }));

    return new Response(new Uint8Array(output), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="comissoes_mensais.xlsx"',
        'X-Commission-Summary': encodeURIComponent(JSON.stringify(resumo)),
        'X-Audit-Count': String(result.auditRows.length),
        'X-Commission-Execution-Id': saveResult.executionId ?? '',
        'X-Commission-Saved': saveResult.saved ? 'true' : 'false',
        'X-Commission-Warning': encodeURIComponent(saveResult.warning ?? ''),
      },
    });
  } catch (error) {
    console.error('[comissoes/calcular]', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Erro ao calcular comissões.' },
      { status: 500 },
    );
  }
}
