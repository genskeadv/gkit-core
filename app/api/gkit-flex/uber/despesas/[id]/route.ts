import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  return NextResponse.redirect(new URL(`/api/gkit-fat/uber/despesas/${id}`, request.url), 307)
}
