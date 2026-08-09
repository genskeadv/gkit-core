import { requireGkitFlexApiAccess } from '@/features/gkit-flex/api-auth'
import { createMoneyAccount, listMoneyAccounts } from '@/features/gkit-money/moneyPersistence'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const accessError = await requireGkitFlexApiAccess()
    if (accessError) return accessError
    const contas = await listMoneyAccounts()
    return NextResponse.json({ contas })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao carregar contas.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const accessError = await requireGkitFlexApiAccess('gkit_flex.contas_pagar.write')
    if (accessError) return accessError
    const payload = await request.json()
    const conta = await createMoneyAccount({ nome: String(payload?.nome || '') })
    return NextResponse.json({ conta }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao criar conta.' }, { status: 500 })
  }
}
