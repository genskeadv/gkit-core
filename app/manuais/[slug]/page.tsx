import Link from 'next/link'
import { notFound } from 'next/navigation'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { ReactNode } from 'react'

type ManualSource = {
  title: string
  folder: 'manuais' | 'modulos'
  filename: string
  moduleHref: string
}

const manualSources: Record<string, ManualSource> = {
  core: { title: 'Manual - Core', folder: 'manuais', filename: 'core.md', moduleHref: '/admin' },
  colab: { title: 'Manual - GKIT Colab', folder: 'modulos', filename: 'colab.md', moduleHref: '/modulos/colab' },
  'gkit-ate': { title: 'Manual - GKIT ATE', folder: 'manuais', filename: 'gkit-ate.md', moduleHref: '/modulos/gkit-ate' },
  'gkit-ciclo': { title: 'Manual - GKIT Ciclo', folder: 'manuais', filename: 'gkit-ciclo.md', moduleHref: '/modulos/gkit-ciclo' },
  'gkit-dir': { title: 'Manual - GKIT DIR', folder: 'manuais', filename: 'gkit-dir.md', moduleHref: '/modulos/gkit-dir' },
  'gkit-fat': { title: 'Manual - GKIT FAT', folder: 'manuais', filename: 'gkit-fat.md', moduleHref: '/modulos/gkit-fat' },
  'gkit-flex': { title: 'Manual - GKIT Flex', folder: 'manuais', filename: 'gkit-flex.md', moduleHref: '/modulos/gkit-flex' },
  'gkit-jur': { title: 'Manual - GKIT Jur', folder: 'modulos', filename: 'gkit-jur.md', moduleHref: '/modulos/gkit-jur/inbox' },
  'gkit-new': { title: 'Manual - GKIT New', folder: 'manuais', filename: 'gkit-new.md', moduleHref: '/modulos/gkit-new' },
  'gkit-performa': { title: 'Manual - GKIT Performa', folder: 'manuais', filename: 'gkit-performa.md', moduleHref: '/modulos/gkit-performa' },
}

export const dynamic = 'force-static'
export const dynamicParams = false

export function generateStaticParams() {
  return Object.keys(manualSources).map((slug) => ({ slug }))
}

function renderInline(text: string) {
  const parts = text.split(/(`[^`]+`)/g)

  return parts.map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={index}>{part.slice(1, -1)}</code>
    }

    return part
  })
}

function flushParagraph(nodes: ReactNode[], paragraph: string[], key: number) {
  if (!paragraph.length) return key
  nodes.push(<p key={`p-${key}`}>{renderInline(paragraph.join(' '))}</p>)
  paragraph.length = 0
  return key + 1
}

function flushList(nodes: ReactNode[], list: string[], ordered: boolean, key: number) {
  if (!list.length) return key
  const Tag = ordered ? 'ol' : 'ul'
  nodes.push(
    <Tag key={`list-${key}`}>
      {list.map((item, index) => <li key={`${key}-${index}`}>{renderInline(item)}</li>)}
    </Tag>,
  )
  list.length = 0
  return key + 1
}

function renderMarkdown(markdown: string) {
  const nodes: ReactNode[] = []
  const paragraph: string[] = []
  const list: string[] = []
  let ordered = false
  let key = 0

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim()

    if (!line) {
      key = flushParagraph(nodes, paragraph, key)
      key = flushList(nodes, list, ordered, key)
      continue
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(line)
    if (heading) {
      key = flushParagraph(nodes, paragraph, key)
      key = flushList(nodes, list, ordered, key)
      const level = heading[1].length
      if (level === 1) nodes.push(<h1 key={`h-${key}`}>{renderInline(heading[2])}</h1>)
      if (level === 2) nodes.push(<h2 key={`h-${key}`}>{renderInline(heading[2])}</h2>)
      if (level === 3) nodes.push(<h3 key={`h-${key}`}>{renderInline(heading[2])}</h3>)
      key += 1
      continue
    }

    const unorderedItem = /^-\s+(.+)$/.exec(line)
    if (unorderedItem) {
      key = flushParagraph(nodes, paragraph, key)
      if (list.length && ordered) key = flushList(nodes, list, ordered, key)
      ordered = false
      list.push(unorderedItem[1])
      continue
    }

    const orderedItem = /^\d+\.\s+(.+)$/.exec(line)
    if (orderedItem) {
      key = flushParagraph(nodes, paragraph, key)
      if (list.length && !ordered) key = flushList(nodes, list, ordered, key)
      ordered = true
      list.push(orderedItem[1])
      continue
    }

    key = flushList(nodes, list, ordered, key)
    paragraph.push(line)
  }

  flushParagraph(nodes, paragraph, key)
  flushList(nodes, list, ordered, key + 1)

  return nodes
}

export default async function ManualPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const source = manualSources[slug]
  if (!source) notFound()

  let markdown = ''
  try {
    markdown = await readFile(path.join(process.cwd(), 'docs', source.folder, source.filename), 'utf8')
  } catch {
    notFound()
  }

  return (
    <main className="manual-page">
      <div className="manual-wrap">
        <header className="manual-header">
          <div>
            <p className="platform-kicker">Manual de uso</p>
            <h1>{source.title}</h1>
          </div>
          <div className="manual-actions">
            <Link className="module-action secondary" href="/plataforma">Plataforma</Link>
            <Link className="module-action primary" href={source.moduleHref}>Abrir modulo</Link>
          </div>
        </header>
        <article className="manual-article">
          {renderMarkdown(markdown)}
        </article>
      </div>
    </main>
  )
}
