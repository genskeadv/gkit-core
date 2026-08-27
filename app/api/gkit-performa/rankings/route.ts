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
      return NextResponse.json({ error: 'Não há ranking para gravar.' }, { status: 400 })
    }

    if (ranking.length > MAX_RANKING_ITEMS) {
      return NextResponse.json({ error: `Ranking limitado a ${MAX_RANKING_ITEMS} itens por gravação.` }, { status: 400 })
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
      return NextResponse.json({ error: loteError?.message ?? 'Não foi possível gravar o ranking.' }, { status: 500 })
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
      await admin()
        .schema('gkit_performa')
        .from('ranking_lotes')
        .delete()
        .eq('id', lote.id)

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

export async function GET(request: NextRequest) {
  try {
    const access = await requireGkitPerformaApiAccess('gkit_performa.rankings.read')
    if (access.error) return access.error

    const { searchParams } = new URL(request.url)
    const requestedId = text(searchParams.get('id'))
    const limit = Math.min(50, Math.max(1, numberValue(searchParams.get('limit')) || 12))

    let lotesQuery = admin()
      .schema('gkit_performa')
      .from('ranking_lotes')
      .select('id, arquivo_nome, sheet_name, ranking_tipo, filtros, resumo, total_registros, total_unidades, total_ranqueados, criado_em')
      .order('criado_em', { ascending: false })

    if (requestedId) {
      lotesQuery = lotesQuery.eq('id', requestedId).limit(1)
    } else {
      lotesQuery = lotesQuery.limit(limit)
    }

    const { data: lotes, error: lotesError } = await lotesQuery

    if (lotesError) {
      return NextResponse.json({ error: lotesError.message }, { status: 500 })
    }

    const loteIds = (lotes ?? []).map((lote: { id: string }) => lote.id)

    const { data: itens, error: itensError } = loteIds.length
      ? await admin()
        .schema('gkit_performa')
        .from('ranking_itens')
        .select('id, lote_id, posicao, nome, unidades, concluidas, percentual_conclusao, no_prazo, percentual_no_prazo, abertas_atrasadas, media_dias, score, metadata, criado_em')
        .in('lote_id', loteIds)
        .order('posicao', { ascending: true })
      : { data: [], error: null }

    if (itensError) {
      return NextResponse.json({ error: itensError.message }, { status: 500 })
    }

    const itemsByLot = new Map<string, unknown[]>()
    for (const item of itens ?? []) {
      const loteId = String((item as { lote_id?: string }).lote_id ?? '')
      itemsByLot.set(loteId, [...(itemsByLot.get(loteId) ?? []), item])
    }

    return NextResponse.json({
      rankings: (lotes ?? []).map((lote: { id: string }) => ({
        ...lote,
        itens: itemsByLot.get(lote.id) ?? [],
      })),
    })
  } catch (error) {
    console.error('[gkit-performa/rankings][GET]', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao consultar rankings.' }, { status: 500 })
  }
}
