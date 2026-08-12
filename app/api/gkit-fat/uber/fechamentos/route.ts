import { NextRequest, NextResponse } from 'next/server'
import { requireGkitFatApiAccess } from '@/features/gkit-fat/api-auth'
import { generateUberWeeklyClosings } from '@/features/gkit-flex/uber/uberPersistence'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const accessError = await requireGkitFatApiAccess('gkit_fat.uber.write')
    if (accessError) return accessError

    const payload = await request.json()
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    const result = await generateUberWeeklyClosings({
      periodStart: payload.periodStart ? String(payload.periodStart) : null,
      periodEnd: payload.periodEnd ? String(payload.periodEnd) : null,
      createdBy: user?.id || null,
    })

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao gerar fechamento semanal Uber.' }, { status: 500 })
  }
}
