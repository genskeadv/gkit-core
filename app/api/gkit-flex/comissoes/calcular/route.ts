import { requireGkitFlexApiAccess } from '@/features/gkit-flex/api-auth';
import { NextRequest } from 'next/server';
import { getCicloClientesForComissoes } from '@/features/gkit-flex/ciclo-clientes';
import { buildCommissionWorkbook, processCommissionWithClients } from '@/features/gkit-flex/comissoes/commissionProcessor';
import { saveCommissionExecution } from '@/features/gkit-flex/comissoes/supabasePersistence';
import type { CommissionProcessResult } from '@/features/gkit-flex/comissoes/types';
import { syncCommissionPayablesForCompetencia } from '@/features/gkit-flex/contas-pagar/payablePersistence';

export const runtime = 'nodejs';

function buildResumo(result: CommissionProcessResult) {
  return result.summaries.map((row) => ({
    categoria: row.categoria,
    carteira: row.carteira,
    quantidadeLancamentos: row.quantidadeLancamentos,
    valorRecebido: row.valorRecebido,
    valorAposReducao: row.valorAposReducao,
    comissaoFinal: row.comissaoFinal,
  }));
}

function buildTotals(resumo: ReturnType<typeof buildResumo>) {
  return resumo.reduce(
    (acc, row) => ({
      valorRecebido: Math.round((acc.valorRecebido + row.valorRecebido) * 100) / 100,
      valorAposReducao: Math.round((acc.valorAposReducao + row.valorAposReducao) * 100) / 100,
      comissaoFinal: Math.round((acc.comissaoFinal + row.comissaoFinal) * 100) / 100,
    }),
    { valorRecebido: 0, valorAposReducao: 0, comissaoFinal: 0 },
  );
}

export async function POST(request: NextRequest) {
  try {
    const accessError = await requireGkitFlexApiAccess();
    if (accessError) return accessError;
    const formData = await request.formData();
    const contasFile = formData.get('contasReceber');
    const competencia = String(formData.get('competencia') || '');
    const action = String(formData.get('action') || 'download');

    if (!(contasFile instanceof File)) {
      return Response.json(
        { error: 'Envie o arquivo de contas a receber.' },
        { status: 400 },
      );
    }

    const contasBuffer = await contasFile.arrayBuffer();
    const clientesCiclo = await getCicloClientesForComissoes();

    const result = processCommissionWithClients(contasBuffer, clientesCiclo);
    const resumo = buildResumo(result);
    const totals = buildTotals(resumo);

    if (action === 'preview') {
      return Response.json({
        arquivo: contasFile.name,
        competencia,
        resumo,
        totals,
        auditCount: result.auditRows.length,
      });
    }

    const saveResult = await saveCommissionExecution({
      competencia,
      contasFileName: contasFile.name,
      clientesFileName: 'ciclo.clientes',
      result,
    });
    let payablesSync: { synced: boolean; inserted: number } | null = null;
    if (saveResult.saved) {
      payablesSync = await syncCommissionPayablesForCompetencia(competencia);
    }

    if (action === 'save') {
      return Response.json({
        arquivo: contasFile.name,
        competencia,
        resumo,
        totals,
        auditCount: result.auditRows.length,
        saved: saveResult.saved,
        executionId: saveResult.executionId,
        payablesSync,
        warning: saveResult.warning ?? null,
      });
    }

    const output = buildCommissionWorkbook(result);

    return new Response(new Uint8Array(output), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="comissoes_mensais.xlsx"',
        'X-Commission-Summary': encodeURIComponent(JSON.stringify(resumo)),
        'X-Audit-Count': String(result.auditRows.length),
        'X-Commission-Execution-Id': saveResult.executionId ?? '',
        'X-Commission-Saved': saveResult.saved ? 'true' : 'false',
        'X-Commission-Payables-Synced': payablesSync?.synced ? 'true' : 'false',
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
