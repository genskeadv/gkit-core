import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { refreshGkitJurProcessSummaries } from '@/features/gkit-jur/summary-service'

function readLocalEnv() {
  const env: Record<string, string> = {}
  const envPath = join(process.cwd(), '.env.local')
  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/)

  for (const line of lines) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (match) env[match[1]] = match[2].trim()
  }

  return env
}

for (const [key, value] of Object.entries(readLocalEnv())) {
  process.env[key] = String(value)
}

function readLimit() {
  const arg = process.argv.find((value) => value.startsWith('--limit='))
  const parsed = Number.parseInt(arg?.slice('--limit='.length) ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

async function main() {
  const result = await refreshGkitJurProcessSummaries({ limit: readLimit(), onlyActive: true })
  console.log(JSON.stringify(result, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
