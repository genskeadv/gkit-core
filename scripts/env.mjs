import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export function readLocalEnv() {
  const env = {}
  const envPath = join(process.cwd(), '.env.local')
  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/)

  for (const line of lines) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (match) {
      env[match[1]] = match[2].trim()
    }
  }

  return env
}

export function readArg(name) {
  const prefix = `--${name}=`
  const arg = process.argv.find((value) => value.startsWith(prefix))
  return arg ? arg.slice(prefix.length).trim() : ''
}
