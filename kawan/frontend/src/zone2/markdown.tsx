// markdown.tsx — XSS-safe inline markdown renderer (T1).
// Emits React nodes only: no dangerouslySetInnerHTML, no raw HTML.
// Supports: **bold**, __bold__, *italic*, _italic_, - list, * list, 1. list, \n breaks.
// Explicitly NOT: links, images, tables, code blocks, blockquotes, raw HTML.

import type { ReactNode } from 'react'

// Inline-parse a single line for **bold**, __bold__, *italic*, _italic__.
// Returns an array of React nodes (strings and <strong>/<em> elements).
function parseInline(text: string, key: string): ReactNode[] {
  const nodes: ReactNode[] = []
  // Pattern: (**text**) | (__text__) | (*text*) | (_text_)
  const re = /(\*\*(.+?)\*\*|__(.+?)__|(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)|(?<!_)_(?!_)(.+?)(?<!_)_(?!_))/g
  let last = 0
  let m: RegExpExecArray | null
  let idx = 0
  // biome-ignore lint/suspicious/noAssignInExpressions: canonical regex-exec loop
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      nodes.push(text.slice(last, m.index))
    }
    const bold = m[2] ?? m[3]
    const italic = m[4] ?? m[5]
    if (bold !== undefined) {
      nodes.push(<strong key={`${key}-b${idx}`}>{bold}</strong>)
    } else if (italic !== undefined) {
      nodes.push(<em key={`${key}-i${idx}`}>{italic}</em>)
    }
    last = m.index + m[0].length
    idx++
  }
  if (last < text.length) {
    nodes.push(text.slice(last))
  }
  return nodes.length > 0 ? nodes : [text]
}

/**
 * renderMarkdown — converts a markdown string to React nodes.
 * XSS-safe: emits only text nodes + <strong>/<em>/<ul>/<ol>/<li>/<br>.
 * Never uses dangerouslySetInnerHTML.
 */
export function renderMarkdown(text: string): ReactNode {
  if (!text) return null

  const lines = text.split('\n')
  const result: ReactNode[] = []
  let ulItems: ReactNode[] = []
  let olItems: ReactNode[] = []

  function flushUl() {
    if (ulItems.length > 0) {
      result.push(
        <ul key={`ul-${result.length}`} style={{ paddingLeft: '1.25em', margin: '0.25em 0', listStyleType: 'disc' }}>
          {ulItems}
        </ul>
      )
      ulItems = []
    }
  }

  function flushOl() {
    if (olItems.length > 0) {
      result.push(
        <ol key={`ol-${result.length}`} style={{ paddingLeft: '1.25em', margin: '0.25em 0' }}>
          {olItems}
        </ol>
      )
      olItems = []
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const ulMatch = /^[-*]\s+(.+)$/.exec(line)
    const olMatch = /^\d+\.\s+(.+)$/.exec(line)

    if (ulMatch) {
      flushOl()
      ulItems.push(<li key={`li-ul-${i}`}>{parseInline(ulMatch[1], `ul-${i}`)}</li>)
    } else if (olMatch) {
      flushUl()
      olItems.push(<li key={`li-ol-${i}`}>{parseInline(olMatch[1], `ol-${i}`)}</li>)
    } else {
      flushUl()
      flushOl()
      if (line === '') {
        // Blank line between paragraphs — emit a small spacing break
        result.push(<br key={`br-blank-${i}`} />)
      } else {
        result.push(
          <span key={`p-${i}`} style={{ display: 'block' }}>
            {parseInline(line, `line-${i}`)}
          </span>
        )
      }
    }
  }

  flushUl()
  flushOl()

  return <>{result}</>
}
