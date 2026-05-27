export function requiredString(value: FormDataEntryValue | null, field: string) {
  const parsed = String(value ?? '').trim()
  if (!parsed) throw new Error(`${field} é obrigatório.`)
  return parsed
}

export function optionalString(value: FormDataEntryValue | null) {
  const parsed = String(value ?? '').trim()
  return parsed || null
}

export function normalizeCode(value: string) {
  const code = value.trim().toLowerCase()
  if (!/^[a-z0-9_]+$/.test(code)) {
    throw new Error('Código deve usar apenas letras minúsculas, números e underscore.')
  }
  return code
}

export function parseNivel(value: FormDataEntryValue | null) {
  const nivel = Number(value ?? 10)
  if (!Number.isInteger(nivel) || nivel < 1 || nivel > 999) {
    throw new Error('Nível deve ser um número inteiro entre 1 e 999.')
  }
  return nivel
}

export function parseHexColor(value: FormDataEntryValue | null) {
  const parsed = String(value ?? '').trim()
  if (!parsed) return null
  if (!/^#[0-9a-fA-F]{6}$/.test(parsed)) throw new Error('Cor deve estar no formato #RRGGBB.')
  return parsed
}
