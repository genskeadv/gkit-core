import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const target = new URL('/api/gkit-fat/uber/importar', request.url)
  target.search = request.nextUrl.search
  return NextResponse.redirect(target, 307)
}

export async function POST(request: NextRequest) {
  return NextResponse.redirect(new URL('/api/gkit-fat/uber/importar', request.url), 307)
}
