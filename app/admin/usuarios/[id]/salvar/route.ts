import { NextResponse } from "next/server"
import { saveUsuarioForm } from "@/features/admin/actions"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const formData = await request.formData()
  formData.set("id", id)

  try {
    await saveUsuarioForm(formData)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível salvar o usuário."
    const url = new URL(`/admin/usuarios/${id}`, request.url)
    url.searchParams.set("error", message)
    return NextResponse.redirect(url, { status: 303 })
  }

  return NextResponse.redirect(new URL("/admin/usuarios", request.url), { status: 303 })
}
