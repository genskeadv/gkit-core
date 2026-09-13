import { timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getGkitJurInadimplenciaReportData } from '@/features/gkit-jur/reporting'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function cleanEnv(value: unknown) {
  return String(value ?? '').replace(/^["']|["']$/g, '').trim()
}

function bearerToken(request: NextRequest) {
  const authorization = request.headers.get('authorization') ?? ''
  const match = authorization.match(/^Bearer\s+(.+)$/i)
  return cleanEnv(match?.[1] ?? request.headers.get('x-gkit-internal-token'))
}

function safeEquals(left: string, right: string) {
  if (!left || !right) return false
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  if (leftBuffer.length !== rightBuffer.length) return false
  return timingSafeEqual(leftBuffer, rightBuffer)
}

function isAuthorized(request: NextRequest) {
  const expected = cleanEnv(process.env.GKIT_INTERNAL_API_TOKEN) || cleanEnv(process.env.CRON_SECRET)
  return safeEquals(bearerToken(request), expected)
}

function numberParam(value: string | null) {
  if (!value) return undefined
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : undefined
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 })
  }

  try {
    const params = request.nextUrl.searchParams
    const data = await getGkitJurInadimplenciaReportData({
      clienteId: params.get('cliente_id'),
      cnpj: params.get('cnpj'),
      competencia: params.get('competencia'),
      dataFim: params.get('data_fim'),
      dataInicio: params.get('data_inicio'),
      movimentosLimitPorProcesso: numberParam(params.get('movimentos_limit_por_processo')),
    })

    return NextResponse.json({ data, success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro inesperado ao montar dados processuais do relatório.'
    const status = /informe|invalida|formato|posterior/i.test(message) ? 400 : 500
    return NextResponse.json({ error: message, success: false }, { status })
  }
}
