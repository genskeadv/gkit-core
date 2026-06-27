export const RETIRED_MODULE_CODES = ['crm', 'din', 'fix', 'flex', 'intr'] as const

const retiredModuleSet = new Set<string>(RETIRED_MODULE_CODES)

export function isRetiredModuleCode(value: string) {
  return retiredModuleSet.has(value)
}

export function isRetiredModulePath(pathname: string) {
  return RETIRED_MODULE_CODES.some((code) => {
    const prefix = `/modulos/${code}`
    return pathname === prefix || pathname.startsWith(`${prefix}/`)
  })
}
