import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requireGkitPerformaApiAccess } from '@/features/gkit-performa/api-auth'

export const runtime = 'nodejs'

const MAX_RANKING_ITEMS = 500

function admin() {
  return createSupabaseAdminClient() as any
}

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function text(value: unknown, fallback = '') {
  const raw = String(value ?? '').trim()
  return raw || fallback
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireGkitPerformaApiAccess('gkit_performa.rankings.write')
    if (access.error) return access.error

    const payload = await request.json()
    const ranking = Array.isArray(payload?.ranking) ? payload.ranking : []

    if (!ranking.length) {
      return NextResponse.json({ error: 'Nao ha ranking para gravar.' }, { status: 400 })
    }

    if (ranking.length > MAX_RANKING_ITEMS) {
      return NextResponse.json({ error: `Ranking limitado a ${MAX_RANKING_ITEMS} itens por gravacao.` }, { status: 400 })
    }

    const rankingTipo = payload?.rankingTipo === 'executor' ? 'executor' : 'responsavel'
    const lotePayload = {
      arquivo_nome: text(payload?.fileName, 'Agenda'),
      sheet_name: text(payload?.sheetName) || null,
      ranking_tipo: rankingTipo,
      filtros: payload?.filters && typeof payload.filters === 'object' ? payload.filters : {},
      resumo: payload?.summary && typeof payload.summary === 'object' ? payload.summary : {},
      total_registros: numberValue(payload?.summary?.registros),
      total_unidades: numberValue(payload?.summary?.unidades),
      total_ranqueados: ranking.length,
      criado_por: access.usuario.id,
    }

    const { data: lote, error: loteError } = await admin()
      .schema('gkit_performa')
      .from('ranking_lotes')
      .insert(lotePayload)
      .select('id, criado_em')
      .single()

    if (loteError || !lote) {
      return NextResponse.json({ error: loteError?.message ?? 'Nao foi possivel gravar o ranking.' }, { status: 500 })
    }

    const itens = ranking.map((item: Record<string, unknown>, index: number) => ({
      lote_id: lote.id,
      posicao: numberValue(item.posicao) || index + 1,
      nome: text(item.name, 'Sem nome'),
      unidades: numberValue(item.unidades),
      concluidas: numberValue(item.concluidas),
      percentual_conclusao: numberValue(item.percentualConclusao),
      no_prazo: numberValue(item.noPrazo),
      percentual_no_prazo: numberValue(item.percentualNoPrazo),
      abertas_atrasadas: numberValue(item.abertasAtrasadas),
      media_dias: numberValue(item.mediaDias),
      score: numberValue(item.score),
      metadata: {
        rankingTipo,
      },
    }))

    const { error: itensError } = await admin()
      .schema('gkit_performa')
      .from('ranking_itens')
      .insert(itens)

    if (itensError) {
      return NextResponse.json({ error: itensError.message }, { status: 500 })
    }

    return NextResponse.json({
      id: lote.id,
      criado_em: lote.criado_em,
      total: itens.length,
    })
  } catch (error) {
    console.error('[gkit-performa/rankings][POST]', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao gravar ranking.' }, { status: 500 })
  }
}
