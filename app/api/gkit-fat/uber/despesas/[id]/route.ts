import { NextRequest, NextResponse } from 'next/server'
import { requireGkitFatApiAccess } from '@/features/gkit-fat/api-auth'
import { updateUberExpenseStatus } from '@/features/gkit-flex/uber/uberPersistence'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const accessError = await requireGkitFatApiAccess('gkit_fat.uber.write')
    if (accessError) return accessError

    const { id } = await params
    const payload = await request.json()
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    const result = await updateUberExpenseStatus({
      id,
      status: String(payload.status || ''),
      observation: payload.observation ? String(payload.observation) : null,
      updatedBy: user?.id || null,
    })

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao atualizar despesa Uber.' }, { status: 500 })
  }
}
