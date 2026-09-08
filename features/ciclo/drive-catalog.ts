import { cicloOnboardingDocumentos } from '@/features/ciclo/onboarding-defaults'

export type CicloDriveDocumentType = (typeof cicloOnboardingDocumentos)[number]['tipo_documento']

export type CicloDriveParsedFileName = {
  canonicalName: string | null
  clienteSlug: string | null
  dataVencimento: string | null
  documentoCliente: string | null
  errors: string[]
  extensao: string | null
  ok: boolean
  semVencimento: boolean
  tipoDocumento: CicloDriveDocumentType | null
  tipoToken: string | null
  versao: string | null
  warnings: string[]
}

export type CicloDriveSuggestedFileNameInput = {
  clienteDocumento: string
  clienteNome: string
  dataVencimento?: string | null
  extension?: string | null
  tipoDocumento: CicloDriveDocumentType | string
  versao?: string | null
}

const CICLO_DRIVE_DOCUMENT_TITLES = new Map<CicloDriveDocumentType, string>(
  cicloOnboardingDocumentos.map((documento) => [documento.tipo_documento, documento.titulo]),
)

const CICLO_DRIVE_DOCUMENT_TYPES = new Set<CicloDriveDocumentType>(
  cicloOnboardingDocumentos.map((documento) => documento.tipo_documento),
)

const CICLO_DRIVE_DOCUMENT_ALIASES = new Map<string, CicloDriveDocumentType>()

for (const tipo of CICLO_DRIVE_DOCUMENT_TYPES) {
  CICLO_DRIVE_DOCUMENT_ALIASES.set(tipo, tipo)
  CICLO_DRIVE_DOCUMENT_ALIASES.set(tipo.replace(/_/g, '-'), tipo)
}

for (const [alias, tipo] of Object.entries({
  ata: 'ata_eleicao',
  'ata-assembleia': 'ata_eleicao',
  'ata-assembleia-eleicao': 'ata_eleicao',
  'ata-de-eleicao': 'ata_eleicao',
  'ata-eleicao-sindico': 'ata_eleicao',
  'ata-de-prestacao-de-contas': 'ata_previsao_orcamentaria',
  'ata-orcamentaria': 'ata_previsao_orcamentaria',
  'ata-previsao': 'ata_previsao_orcamentaria',
  'ata-previsao-orcamento': 'ata_previsao_orcamentaria',
  'cadastro-de-unidade': 'cadastro_unidade',
  'cadastro-de-unidades': 'cadastro_unidade',
  'cadastro-unidades': 'cadastro_unidade',
  'cartao-do-cnpj': 'cartao_cnpj',
  'cartao-cnpj': 'cartao_cnpj',
  cnpj: 'cartao_cnpj',
  'cnpj-sindico': 'cnpj_empresa_sindico',
  'comprovante-cnpj': 'cartao_cnpj',
  'cpf': 'cpf_sindico',
  'cpf-do-sindico': 'cpf_sindico',
  'cpf-sindico': 'cpf_sindico',
  'documento-sindico': 'cpf_sindico',
  'empresa-sindico': 'cnpj_empresa_sindico',
  'ficha-unidades': 'cadastro_unidade',
  'previsao-orcamentaria': 'ata_previsao_orcamentaria',
  'regulamento-interno': 'regulamento',
  sindico: 'cpf_sindico',
}) as Array<[string, CicloDriveDocumentType]>) {
  CICLO_DRIVE_DOCUMENT_ALIASES.set(alias, tipo)
}

export function cicloDriveDocumentTitle(tipoDocumento: string) {
  return CICLO_DRIVE_DOCUMENT_TITLES.get(tipoDocumento as CicloDriveDocumentType) ?? tipoDocumento
}

export function cicloDriveFileToken(value: string) {
  return normalizeCicloDriveText(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function normalizeCicloDriveText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function resolveCicloDriveDocumentType(value: string | null | undefined): CicloDriveDocumentType | null {
  const token = cicloDriveFileToken(String(value ?? '').replace(/_/g, '-'))
  return CICLO_DRIVE_DOCUMENT_ALIASES.get(token) ?? null
}

export function parseCicloDriveFileName(fileName: string): CicloDriveParsedFileName {
  const errors: string[] = []
  const warnings: string[] = []
  const cleanName = fileName.trim().replace(/\\/g, '/').split('/').pop() ?? ''
  const extensionMatch = cleanName.match(/\.([a-z0-9]{1,12})$/i)
  const extensao = extensionMatch ? extensionMatch[1].toLowerCase() : null
  const baseName = extensionMatch ? cleanName.slice(0, -extensionMatch[0].length) : cleanName
  const parts = baseName.split('__').map((part) => part.trim()).filter(Boolean)

  if (!extensao) errors.push('extensao_ausente')
  if (parts.length < 3) errors.push('padrao_cliente_tipo_data_incompleto')
  if (parts.length > 4) warnings.push('campos_extras_ignorados')

  const clienteMatch = parts[0]?.match(/^(\d{11}|\d{14})_(.+)$/)
  const documentoCliente = clienteMatch ? clienteMatch[1] : null
  const clienteSlug = clienteMatch ? cicloDriveFileToken(clienteMatch[2]) : null
  if (!clienteMatch) errors.push('cliente_sem_documento_normalizado')

  const tipoToken = parts[1] ? cicloDriveFileToken(parts[1]) : null
  const tipoDocumento = resolveCicloDriveDocumentType(tipoToken)
  if (!tipoToken) errors.push('tipo_documento_ausente')
  else if (!tipoDocumento) errors.push('tipo_documento_desconhecido')

  const dataToken = parts[2] ? cicloDriveFileToken(parts[2]) : null
  let dataVencimento: string | null = null
  let semVencimento = false
  if (!dataToken) {
    errors.push('data_vencimento_ausente')
  } else if (dataToken === 'sem-vencimento' || dataToken === 'sem-validade') {
    semVencimento = true
  } else if (isValidIsoDate(dataToken)) {
    dataVencimento = dataToken
  } else {
    errors.push('data_vencimento_invalida')
  }

  const versao = parts[3] ? cicloDriveFileToken(parts[3]) || null : null
  const canonicalName = documentoCliente && clienteSlug && tipoDocumento && (dataVencimento || semVencimento) && extensao
    ? suggestCicloDriveFileName({
      clienteDocumento: documentoCliente,
      clienteNome: clienteSlug,
      dataVencimento: dataVencimento ?? null,
      extension: extensao,
      tipoDocumento,
      versao,
    })
    : null

  return {
    canonicalName,
    clienteSlug,
    dataVencimento,
    documentoCliente,
    errors,
    extensao,
    ok: errors.length === 0,
    semVencimento,
    tipoDocumento,
    tipoToken,
    versao,
    warnings,
  }
}

export function parseCicloDrivePath(filePath: string): CicloDriveParsedFileName {
  const parsedFileName = parseCicloDriveFileName(filePath)
  if (parsedFileName.ok) return parsedFileName

  const pathParts = filePath.replace(/\\/g, '/').split('/').map((part) => part.trim()).filter(Boolean)
  const fileName = pathParts.at(-1) ?? filePath
  const extensionMatch = fileName.match(/\.([a-z0-9]{1,12})$/i)
  const extensao = extensionMatch ? extensionMatch[1].toLowerCase() : null
  const clienteFolder = pathParts[0] ?? ''
  const tipoFolder = pathParts.length > 2 ? pathParts[1] : ''
  const clienteInfo = parseClienteFolder(clienteFolder)
  const documentoCliente = clienteInfo.documentoCliente
  const clienteSlug = clienteInfo.clienteSlug
  const tipoToken = tipoFolder ? cicloDriveFileToken(tipoFolder.replace(/^\d+[\s.)-]*/, '')) : null
  const tipoDocumento = resolveCicloDriveDocumentType(tipoToken)
  const dateMatch = fileName.match(/(?:^|[^0-9])(\d{4}-\d{2}-\d{2})(?:[^0-9]|$)/)
  const dataVencimento = dateMatch && isValidIsoDate(dateMatch[1]) ? dateMatch[1] : null
  const errors: string[] = []
  const warnings = [...parsedFileName.errors, ...parsedFileName.warnings]

  if (!extensao) errors.push('extensao_ausente')
  if (!documentoCliente) errors.push('cliente_sem_documento_normalizado')
  if (!tipoToken) errors.push('tipo_documento_ausente')
  else if (!tipoDocumento) errors.push('tipo_documento_desconhecido')
  if (!dataVencimento) warnings.push('data_vencimento_nao_informada_no_nome')

  const semVencimento = !dataVencimento
  const canonicalName = documentoCliente && clienteSlug && tipoDocumento && extensao
    ? suggestCicloDriveFileName({
      clienteDocumento: documentoCliente,
      clienteNome: clienteSlug,
      dataVencimento,
      extension: extensao,
      tipoDocumento,
    })
    : null

  return {
    canonicalName,
    clienteSlug,
    dataVencimento,
    documentoCliente,
    errors,
    extensao,
    ok: errors.length === 0,
    semVencimento,
    tipoDocumento,
    tipoToken,
    versao: null,
    warnings,
  }
}

export function suggestCicloDriveFileName(input: CicloDriveSuggestedFileNameInput) {
  const documento = String(input.clienteDocumento ?? '').replace(/\D/g, '')
  const slug = cicloDriveFileToken(input.clienteNome)
  const tipo = resolveCicloDriveDocumentType(input.tipoDocumento) ?? input.tipoDocumento
  const tipoToken = cicloDriveFileToken(String(tipo).replace(/_/g, '-'))
  const dataToken = input.dataVencimento && isValidIsoDate(input.dataVencimento)
    ? input.dataVencimento
    : 'sem-vencimento'
  const versionToken = input.versao ? `__${cicloDriveFileToken(input.versao)}` : ''
  const extension = cicloDriveFileToken(input.extension || 'pdf') || 'pdf'

  return `${documento}_${slug}__${tipoToken}__${dataToken}${versionToken}.${extension}`
}

function onlyDigits(value: string | null | undefined) {
  return String(value ?? '').replace(/\D/g, '')
}

function parseClienteFolder(folderName: string) {
  const trailingDocument = folderName.match(/(?:^|\s[-–—]\s*)([\d.\-/\s]{11,24})\s*$/)
  const candidate = trailingDocument ? onlyDigits(trailingDocument[1]) : onlyDigits(folderName)
  const documentoCliente = candidate.length === 11 || candidate.length === 14 ? candidate : null
  const clienteName = trailingDocument
    ? folderName.slice(0, trailingDocument.index).trim()
    : folderName

  return {
    clienteSlug: documentoCliente ? cicloDriveFileToken(clienteName) : null,
    documentoCliente,
  }
}

function isValidIsoDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return false

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
}
