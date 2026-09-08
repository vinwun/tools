import type { MarkdownViewerState } from './types.ts'
import { escapeHtml } from '../../foundations/dom.ts'

type MarkdownListItem = {
  text: string
  childList: MarkdownListBlock | null
}

type MarkdownListBlock = {
  type: 'unorderedList' | 'orderedList'
  items: MarkdownListItem[]
}

type MarkdownTableBlock = {
  type: 'table'
  headers: string[]
  rows: string[][]
}

type MarkdownBlock =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | MarkdownListBlock
  | { type: 'blockquote'; text: string }
  | { type: 'code'; language: string | null; text: string }
  | { type: 'rule' }
  | MarkdownTableBlock

export const createInitialMarkdownViewerState = (): MarkdownViewerState => ({
  inputValue: '',
  renderedHtml: '',
  renderedDocument: '',
  status: 'empty',
  selectedFileName: null,
})

const escapeAttribute = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

const sanitizeUrl = (rawUrl: string): string => {
  const trimmed = rawUrl.trim()
  if (!trimmed) {
    return '#'
  }

  const lower = trimmed.toLowerCase()
  if (
    lower.startsWith('http://') ||
    lower.startsWith('https://') ||
    lower.startsWith('mailto:') ||
    lower.startsWith('/') ||
    lower.startsWith('#')
  ) {
    return trimmed
  }

  return '#'
}

const renderInlineText = (value: string): string => {
  const escaped = escapeHtml(value)
  const withStrike = escaped.replace(/~~([^~]+)~~/g, '<del>$1</del>')
  const withBold = withStrike.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  const withItalic = withBold.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  return withItalic.replace(/\[([^\]]+)]\(([^)]+)\)/g, (_, label: string, url: string) => {
    const safeUrl = escapeAttribute(sanitizeUrl(url))
    return `<a href="${safeUrl}" target="_blank" rel="noopener">${label}</a>`
  })
}

const renderInline = (value: string): string => {
  const parts: string[] = []
  let cursor = 0

  while (cursor < value.length) {
    const start = value.indexOf('`', cursor)
    if (start < 0) {
      parts.push(renderInlineText(value.slice(cursor)))
      break
    }

    const end = value.indexOf('`', start + 1)
    if (end < 0) {
      parts.push(renderInlineText(value.slice(cursor)))
      break
    }

    if (start > cursor) {
      parts.push(renderInlineText(value.slice(cursor, start)))
    }

    const codeText = value.slice(start + 1, end)
    parts.push(`<code>${escapeHtml(codeText)}</code>`)
    cursor = end + 1
  }

  return parts.join('')
}

const renderInlineWithBreaks = (value: string): string => renderInline(value).replace(/\n/g, '<br />')

const getIndentLevel = (line: string): number => {
  const match = line.match(/^\s*/)
  const whitespace = match ? match[0] : ''
  return whitespace.replace(/\t/g, '  ').length
}

const splitTableRow = (line: string): string[] => {
  const trimmed = line.trim()
  const stripped = trimmed.startsWith('|') ? trimmed.slice(1) : trimmed
  const normalized = stripped.endsWith('|') ? stripped.slice(0, -1) : stripped
  return normalized.split('|').map((cell) => cell.trim())
}

const parseBlocks = (markdown: string): MarkdownBlock[] => {
  const blocks: MarkdownBlock[] = []
  const lines = markdown.split(/\r?\n/)
  let index = 0

  const isRule = (line: string): boolean =>
    /^\s*(---+|\*\*\*+|___+)\s*$/.test(line)

  const isHeading = (line: string): boolean => /^\s*#{1,6}\s+/.test(line)

  const isFence = (line: string): boolean => /^\s*```/.test(line)

  const matchListItem = (line: string): { indent: number; ordered: boolean; text: string } | null => {
    const unorderedMatch = line.match(/^(\s*)([-*+])\s+(.*)$/)
    if (unorderedMatch) {
      return {
        indent: getIndentLevel(unorderedMatch[1]),
        ordered: false,
        text: unorderedMatch[3],
      }
    }

    const orderedMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/)
    if (orderedMatch) {
      return {
        indent: getIndentLevel(orderedMatch[1]),
        ordered: true,
        text: orderedMatch[3],
      }
    }

    return null
  }

  const isTableSeparator = (line: string): boolean =>
    /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/.test(line)

  const isTableHeader = (line: string, nextLine: string | undefined): boolean =>
    Boolean(nextLine && line.includes('|') && isTableSeparator(nextLine))

  const isBlockquote = (line: string): boolean => /^\s*>\s?/.test(line)

  const isBlank = (line: string): boolean => line.trim().length === 0

  while (index < lines.length) {
    const line = lines[index]

    if (isBlank(line)) {
      index += 1
      continue
    }

    if (isRule(line)) {
      blocks.push({ type: 'rule' })
      index += 1
      continue
    }

    if (isFence(line)) {
      const language = line.replace(/^\s*```\s*/, '').trim() || null
      const codeLines: string[] = []
      index += 1
      while (index < lines.length && !isFence(lines[index])) {
        codeLines.push(lines[index])
        index += 1
      }
      if (index < lines.length && isFence(lines[index])) {
        index += 1
      }
      blocks.push({ type: 'code', language, text: codeLines.join('\n') })
      continue
    }

    if (isHeading(line)) {
      const match = line.match(/^\s*(#{1,6})\s+(.*)$/)
      if (match) {
        blocks.push({ type: 'heading', level: match[1].length, text: match[2].trim() })
      }
      index += 1
      continue
    }

    if (isBlockquote(line)) {
      const quoteLines: string[] = []
      while (index < lines.length && isBlockquote(lines[index])) {
        quoteLines.push(lines[index].replace(/^\s*>\s?/, ''))
        index += 1
      }
      blocks.push({ type: 'blockquote', text: quoteLines.join('\n') })
      continue
    }

    if (isTableHeader(line, lines[index + 1])) {
      const headers = splitTableRow(line)
      index += 2
      const rows: string[][] = []
      while (index < lines.length && lines[index].includes('|') && !isBlank(lines[index])) {
        rows.push(splitTableRow(lines[index]))
        index += 1
      }
      blocks.push({ type: 'table', headers, rows })
      continue
    }

    const listMatch = matchListItem(line)
    if (listMatch) {
      const baseIndent = listMatch.indent
      const ordered = listMatch.ordered
      const items: MarkdownListItem[] = []

      const parseListBlock = (): MarkdownListBlock => {
        while (index < lines.length) {
          const currentLine = lines[index]

          if (isBlank(currentLine)) {
            index += 1
            continue
          }

          const match = matchListItem(currentLine)
          if (!match) {
            break
          }

          if (match.indent < baseIndent) {
            break
          }

          if (match.indent > baseIndent) {
            const lastItem = items[items.length - 1]
            if (!lastItem) {
              break
            }
            const nestedMatch = matchListItem(currentLine)
            if (!nestedMatch) {
              break
            }
            const nestedBaseIndent = nestedMatch.indent
            const nestedOrdered = nestedMatch.ordered
            const nestedItems: MarkdownListItem[] = []

            const parseNestedBlock = (): MarkdownListBlock => {
              while (index < lines.length) {
                const nestedLine = lines[index]
                if (isBlank(nestedLine)) {
                  index += 1
                  continue
                }

                const nested = matchListItem(nestedLine)
                if (!nested) {
                  break
                }

                if (nested.indent < nestedBaseIndent) {
                  break
                }

                if (nested.indent > nestedBaseIndent) {
                  const lastNestedItem = nestedItems[nestedItems.length - 1]
                  if (!lastNestedItem) {
                    break
                  }
                  const deeperMatch = matchListItem(nestedLine)
                  if (!deeperMatch) {
                    break
                  }
                  const deeperBaseIndent = deeperMatch.indent
                  const deeperOrdered = deeperMatch.ordered
                  const deeperItems: MarkdownListItem[] = []

                  const parseDeeperBlock = (): MarkdownListBlock => {
                    while (index < lines.length) {
                      const deeperLine = lines[index]
                      if (isBlank(deeperLine)) {
                        index += 1
                        continue
                      }

                      const deeper = matchListItem(deeperLine)
                      if (!deeper) {
                        break
                      }

                      if (deeper.indent < deeperBaseIndent) {
                        break
                      }

                      if (deeper.indent > deeperBaseIndent) {
                        break
                      }

                      if (deeper.ordered !== deeperOrdered) {
                        break
                      }

                      deeperItems.push({ text: deeper.text, childList: null })
                      index += 1
                    }

                    return {
                      type: deeperOrdered ? 'orderedList' : 'unorderedList',
                      items: deeperItems,
                    }
                  }

                  lastNestedItem.childList = parseDeeperBlock()
                  continue
                }

                if (nested.ordered !== nestedOrdered) {
                  break
                }

                nestedItems.push({ text: nested.text, childList: null })
                index += 1
              }

              return {
                type: nestedOrdered ? 'orderedList' : 'unorderedList',
                items: nestedItems,
              }
            }

            lastItem.childList = parseNestedBlock()
            continue
          }

          if (match.ordered !== ordered) {
            break
          }

          items.push({ text: match.text, childList: null })
          index += 1
        }

        return {
          type: ordered ? 'orderedList' : 'unorderedList',
          items,
        }
      }

      blocks.push(parseListBlock())
      continue
    }

    const paragraphLines: string[] = []
    while (
      index < lines.length &&
      !isBlank(lines[index]) &&
      !isRule(lines[index]) &&
      !isFence(lines[index]) &&
      !isHeading(lines[index]) &&
      !isBlockquote(lines[index]) &&
      !matchListItem(lines[index])
    ) {
      paragraphLines.push(lines[index])
      index += 1
    }
    blocks.push({ type: 'paragraph', text: paragraphLines.join('\n') })
  }

  return blocks
}

export const renderMarkdownToHtml = (markdown: string): string => {
  const blocks = parseBlocks(markdown)
  const renderList = (block: MarkdownListBlock): string => {
    const listItems = block.items
      .map((item) => {
        const child = item.childList ? renderList(item.childList) : ''
        return `<li>${renderInline(item.text)}${child}</li>`
      })
      .join('')
    return block.type === 'orderedList' ? `<ol>${listItems}</ol>` : `<ul>${listItems}</ul>`
  }

  const htmlBlocks = blocks.map((block) => {
    switch (block.type) {
      case 'heading':
        return `<h${block.level}>${renderInline(block.text)}</h${block.level}>`
      case 'paragraph':
        return `<p>${renderInlineWithBreaks(block.text)}</p>`
      case 'unorderedList':
        return renderList(block)
      case 'orderedList':
        return renderList(block)
      case 'blockquote':
        return `<blockquote><p>${renderInlineWithBreaks(block.text)}</p></blockquote>`
      case 'code':
        return `<pre><code${block.language ? ` class="language-${escapeAttribute(block.language)}"` : ''}>${escapeHtml(
          block.text,
        )}</code></pre>`
      case 'table': {
        const headerCells = block.headers.map((cell) => `<th>${renderInline(cell)}</th>`).join('')
        const bodyRows = block.rows
          .map((row) => `<tr>${row.map((cell) => `<td>${renderInline(cell)}</td>`).join('')}</tr>`)
          .join('')
        return `<table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`
      }
      case 'rule':
        return '<hr />'
      default:
        return ''
    }
  })

  return htmlBlocks.join('\n')
}

export const wrapHtmlDocument = (bodyHtml: string): string => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Markdown Output</title>
    <style>
      body { font-family: Inter, Segoe UI, Arial, sans-serif; margin: 2rem; line-height: 1.6; color: #111; }
      pre { background: #f6f8fa; padding: 0.75rem; border-radius: 0.5rem; overflow: auto; line-height: 1.5; min-height: 3rem; }
      code { font-family: Consolas, 'SFMono-Regular', Menlo, Monaco, monospace; font-size: 0.95em; }
      blockquote { border-left: 4px solid #ddd; margin: 1rem 0; padding: 0.25rem 0 0.25rem 1rem; color: #555; }
      hr { border: 0; border-top: 1px solid #ddd; margin: 1.5rem 0; }
      a { color: #1d4ed8; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #ddd; padding: 0.5rem 0.65rem; text-align: left; }
      thead th { background: #f1f1f1; }
    </style>
  </head>
  <body>
${bodyHtml}
  </body>
</html>
`
