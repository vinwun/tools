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
  status: 'empty',
  selectedFileName: null,
})

// Relative URLs have no scheme; of the schemes, only these cannot run script.
const sanitizeUrl = (rawUrl: string): string => {
  const trimmed = rawUrl.trim()
  return trimmed && (/^(https?|mailto):/i.test(trimmed) || !/^[^/?#]*:/.test(trimmed)) ? trimmed : '#'
}

// Emphasis needs a non-space right inside its markers, so "2 * 3 * 4" stays plain text.
const renderEmphasis = (escaped: string): string =>
  escaped
    .replace(/~~(?=\S)([^~]*[^~\s])~~/g, '<del>$1</del>')
    .replace(/\*\*(?=\S)([^*]*[^*\s])\*\*/g, '<strong>$1</strong>')
    .replace(/\*(?=\S)([^*]*[^*\s])\*/g, '<em>$1</em>')

// Code spans and links are cut out before escaping, so their content and URLs are escaped once
// and emphasis never runs inside them.
const renderInline = (value: string): string =>
  value
    .split(/(`[^`]+`|\[[^\]]+]\([^)]+\))/)
    .map((part, index) => {
      if (index % 2 === 0) {
        return renderEmphasis(escapeHtml(part))
      }
      if (part.startsWith('`')) {
        return `<code>${escapeHtml(part.slice(1, -1))}</code>`
      }
      const [, label, url] = part.match(/^\[([^\]]+)]\(([^)]+)\)$/) ?? []
      // Links to a heading in the same document stay in place; everything else opens a new tab.
      const target = url.trim().startsWith('#') ? '' : ' target="_blank" rel="noopener"'
      return `<a href="${escapeHtml(sanitizeUrl(url))}"${target}>${renderEmphasis(escapeHtml(label))}</a>`
    })
    .join('')

// Same ids as GitHub, so a table of contents written for GitHub ("#my-chapter") works here too.
const toHeadingId = (text: string): string =>
  text.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s/g, '-')

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

  // Deeper-indented items become the child list of the item above, at any depth.
  const parseList = (): MarkdownListBlock => {
    const first = matchListItem(lines[index])
    const items: MarkdownListItem[] = []
    while (first && index < lines.length) {
      if (isBlank(lines[index])) {
        index += 1
        continue
      }

      const match = matchListItem(lines[index])
      if (!match || match.indent < first.indent) {
        break
      }

      const lastItem = items[items.length - 1]
      if (match.indent > first.indent && lastItem) {
        lastItem.childList = parseList()
        continue
      }

      if (match.ordered !== first.ordered) {
        break
      }

      items.push({ text: match.text, childList: null })
      index += 1
    }

    return { type: first?.ordered ? 'orderedList' : 'unorderedList', items }
  }

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

    if (matchListItem(line)) {
      blocks.push(parseList())
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
      !isTableHeader(lines[index], lines[index + 1]) &&
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
        return `<h${block.level} id="${escapeHtml(toHeadingId(block.text))}">${renderInline(block.text)}</h${block.level}>`
      case 'paragraph':
        return `<p>${renderInlineWithBreaks(block.text)}</p>`
      case 'unorderedList':
        return renderList(block)
      case 'orderedList':
        return renderList(block)
      case 'blockquote':
        return `<blockquote><p>${renderInlineWithBreaks(block.text)}</p></blockquote>`
      case 'code':
        return `<pre><code${block.language ? ` class="language-${escapeHtml(block.language)}"` : ''}>${escapeHtml(
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

export const wrapHtmlDocument = (bodyHtml: string, title: string, lang: string): string => `<!doctype html>
<html lang="${lang}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
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
