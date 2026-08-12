import { NextRequest, NextResponse } from 'next/server'
import { requireGkitFatApiAccess } from '@/features/gkit-fat/api-auth'
import { getUberDashboard, importUberVoucherReport } from '@/features/gkit-flex/uber/uberPersistence'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const accessError = await requireGkitFatApiAccess('gkit_fat.uber.read')
    if (accessError) return accessError

    const competencia = request.nextUrl.searchParams.get('competencia')
    const result = await getUberDashboard(competencia)
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao consultar conciliacao Uber.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const accessError = await requireGkitFatApiAccess('gkit_fat.uber.write')
    if (accessError) return accessError

    const formData = await request.formData()
    const file = formData.get('uberReport')
    const competencia = String(formData.get('competencia') || '')

    if (!(file instanceof File) || !file.size) {
      return NextResponse.json({ error: 'Anexe o relatorio CSV da Uber.' }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    const result = await importUberVoucherReport({ competencia, file, createdBy: user?.id || null })

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao importar relatorio Uber.' }, { status: 500 })
  }
}
