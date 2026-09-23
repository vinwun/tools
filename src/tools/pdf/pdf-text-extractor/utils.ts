import { getDocument } from 'pdfjs-dist'
import type { PdfTextExtractorFormat } from './types.ts'

export type ExtractedPdfText = {
  pageCount: number
  plainText: string
  markdownText: string
}

type PdfJsTextItem = {
  str: string
  transform: number[]
  width?: number
  height?: number
}

type TextItemPosition = {
  text: string
  x: number
  y: number
  width: number
  fontSize: number
}

type TextLine = {
  y: number
  text: string
  fontSize: number
}

const median = (values: number[]): number => {
  if (values.length === 0) {
    return 0
  }

  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2
  }

  return sorted[middle]
}

const normalizeWhitespace = (value: string): string => value.replace(/\s+/g, ' ').trim()

const toTextItems = (items: PdfJsTextItem[]): TextItemPosition[] =>
  items
    .filter((item) => typeof item.str === 'string' && item.str.trim().length > 0)
    .map((item) => {
      const [scaleX = 0, skewX = 0, skewY = 0, scaleY = 0, translateX = 0, translateY = 0] = item.transform
      const fontSize = Math.hypot(scaleX, skewX) || Math.hypot(skewY, scaleY) || item.height || 0

      return {
        text: item.str,
        x: translateX,
        y: translateY,
        width: item.width ?? 0,
        fontSize,
      }
    })

const buildLinesFromItems = (items: PdfJsTextItem[]): TextLine[] => {
  const positionedItems = toTextItems(items)
  if (positionedItems.length === 0) {
    return []
  }

  const fontSizes = positionedItems.map((item) => item.fontSize).filter((value) => value > 0)
  const baseFontSize = median(fontSizes) || 12
  const lineThreshold = Math.max(2, baseFontSize * 0.25)

  const sorted = [...positionedItems].sort((left, right) => {
    if (left.y !== right.y) {
      return right.y - left.y
    }
    return left.x - right.x
  })

  const grouped: Array<{ y: number; items: TextItemPosition[] }> = []

  sorted.forEach((item) => {
    const current = grouped[grouped.length - 1]
    if (!current || Math.abs(current.y - item.y) > lineThreshold) {
      grouped.push({ y: item.y, items: [item] })
      return
    }

    current.items.push(item)
  })

  return grouped.map((line) => {
    const sortedItems = [...line.items].sort((left, right) => left.x - right.x)
    let text = ''
    let previousItem: TextItemPosition | null = null

    sortedItems.forEach((item) => {
      const chunk = item.text.replace(/\s+/g, ' ')
      if (!chunk) {
        return
      }

      if (!previousItem) {
        text = chunk
      } else {
        const gap = item.x - (previousItem.x + previousItem.width)
        const needsSpace = gap > Math.max(1, previousItem.fontSize * 0.2)
        text += needsSpace && !text.endsWith(' ') ? ` ${chunk}` : chunk
      }

      previousItem = item
    })

    const lineFontSize = median(sortedItems.map((item) => item.fontSize).filter((value) => value > 0)) || baseFontSize

    return {
      y: line.y,
      text: text.trimEnd(),
      fontSize: lineFontSize,
    }
  })
}

const insertParagraphBreaks = (lines: TextLine[], baseFontSize: number): TextLine[] => {
  if (lines.length === 0) return []
  const gaps: number[] = []
  for (let i = 1; i < lines.length; i += 1) {
    gaps.push(Math.abs(lines[i - 1].y - lines[i].y))
  }

  const typicalGap = median(gaps) || baseFontSize * 0.8
  const paragraphThreshold = Math.max(typicalGap, baseFontSize)

  const stitched: TextLine[] = []
  lines.forEach((line) => {
    const previous = stitched[stitched.length - 1]
    if (previous) {
      const gap = Math.abs(previous.y - line.y)
      if (gap > paragraphThreshold) {
        stitched.push({ y: line.y, text: '', fontSize: baseFontSize })
      }
    }
    stitched.push(line)
  })

  return stitched
}

const mergeHyphenatedLines = (lines: string[]): string[] => {
  const merged: string[] = []

  lines.forEach((line) => {
    if (merged.length === 0) {
      merged.push(line)
      return
    }

    const previous = merged[merged.length - 1]

    if (!previous || previous === '' || line === '') {
      merged.push(line)
      return
    }

    if (previous.endsWith('-') && /^[A-Za-zÄÖÜäöüß]/.test(line.trimStart())) {
      merged[merged.length - 1] = previous.slice(0, -1) + line.trimStart()
      return
    }

    if (/-\s*$/.test(previous) && /^[A-Za-zÄÖÜäöüß]/.test(line.trimStart())) {
      merged[merged.length - 1] = previous.replace(/-\s*$/, '') + line.trimStart()
      return
    }

    merged.push(line)
  })

  return merged
}

const splitInlineBullets = (lines: string[]): string[] => {
  const out: string[] = []
  const bulletChars = '•·‣⁃◦✶–—'
  const containsBullet = new RegExp(`[${bulletChars}]|\s[-–—]\s`)
  const splitRegex = new RegExp(`(?:\\s*[${bulletChars}]\\s*|\\s+[-–—]\\s+)`)

  lines.forEach((line) => {
    if (!line) {
      out.push(line)
      return
    }

    if (!containsBullet.test(line)) {
      out.push(line)
      return
    }

    const parts = line.split(splitRegex).map((p) => p.trim()).filter(Boolean)
    if (parts.length <= 1) {
      out.push(line)
      return
    }

    const trimmed = line.trim()
    const startsWithBullet = /^["'`]?\s*[•·‣⁃◦✶\-–—]/.test(trimmed)

    const firstIsShort = parts[0].split(/\s+/).length <= 3

    if (startsWithBullet) {
      parts.forEach((p) => {
        const token = p.replace(/^[-*\s]+/, '')
        out.push(`- ${token}`)
      })
      return
    }

    if (firstIsShort) {
      out.push(parts[0])
      for (let i = 1; i < parts.length; i += 1) {
        const token = parts[i].replace(/^[-*\\s]+/, '')
        out.push(`- ${token}`)
      }
      return
    }

    parts.forEach((p) => {
      const token = p.replace(/^[-*\s]+/, '')
      out.push(`- ${token}`)
    })
  })

  return out
}

const normalizeBulletCharacters = (lines: string[]): string[] => {
  const bulletChars = '•·‣⁃◦✶»'
  const bulletClass = `[${bulletChars}]`
  const leadingRegex = new RegExp(`^\\s*${bulletClass}\\s*`)
  const inlineRegex = new RegExp(`\\s${bulletClass}\\s`, 'g')

  return lines.map((line) => {
    if (!line) return line
    if (leadingRegex.test(line)) {
      return line.replace(leadingRegex, '- ')
    }
    return line.replace(inlineRegex, ' - ')
  })
}

const normalizeBulletSpacing = (lines: string[]): string[] => {
  const out: string[] = []
  let prevWasEmpty = false
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    if (!line) {
      prevWasEmpty = true
      out.push('')
      continue
    }

    const isBullet = /^\s*[-+*]\s+/.test(line)
    if (isBullet && prevWasEmpty) {
      if (out.length > 0 && out[out.length - 1] === '') out.pop()
    }

    out.push(line)
    prevWasEmpty = false
  }

  const collapsed: string[] = []
  let lastEmpty = false
  out.forEach((l) => {
    if (!l) {
      if (!lastEmpty) collapsed.push('')
      lastEmpty = true
    } else {
      collapsed.push(l)
      lastEmpty = false
    }
  })

  return collapsed
}

const isListLine = (text: string): boolean => /^\s*([*-]|\d+[.)]|\u2022)\s+/.test(text)

const toMarkdownLine = (line: TextLine, baseFontSize: number): string => {
  const text = line.text
  if (!text) {
    return ''
  }

  if (!isListLine(text)) {
    if (line.fontSize >= baseFontSize * 1.6) {
      return `# ${text}`
    }
    if (line.fontSize >= baseFontSize * 1.35) {
      return `## ${text}`
    }
    if (line.fontSize >= baseFontSize * 1.2) {
      return `### ${text}`
    }
  }

  return text
}

const buildTextFromLines = (
  lines: TextLine[],
  format: PdfTextExtractorFormat,
  baseFontSize: number,
): string => {
  const cleaned = lines
    .map((line) => ({ ...line, text: normalizeWhitespace(line.text) }))
    .filter((line) => line.text.length > 0)

  if (cleaned.length === 0) {
    return ''
  }

  const stitched = insertParagraphBreaks(cleaned, baseFontSize)
  const textLines = stitched.map((line) => {
    if (!line.text) return ''
    return format === 'md' ? toMarkdownLine(line, baseFontSize) : line.text
  })

  const mergedHyphens = mergeHyphenatedLines(textLines)

  const normalizedChars = normalizeBulletCharacters(mergedHyphens)

  const withBullets = splitInlineBullets(normalizedChars)
  const normalized = normalizeBulletSpacing(withBullets)

  return normalized.join('\n')
}

const joinPageText = (pageTexts: string[], format: PdfTextExtractorFormat): string => {
  if (pageTexts.length <= 1) {
    return pageTexts[0] ?? ''
  }

  if (format === 'md') {
    return pageTexts
      .map((text, index) => `<!-- Page ${index + 1} -->\n\n${text}`)
      .join('\n\n---\n\n')
  }

  return pageTexts
    .map((text, index) => `=== Page ${index + 1} ===\n\n${text}`)
    .join('\n\n')
}

export const extractPdfText = async (file: File): Promise<ExtractedPdfText> => {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const loadingTask = getDocument({ data: bytes })
  const pdfDocument = await loadingTask.promise
  const pageCount = pdfDocument.numPages

  const plainPages: string[] = []
  const markdownPages: string[] = []

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    const page = await pdfDocument.getPage(pageNumber)
    const textContent = await page.getTextContent()
    const lines = buildLinesFromItems(textContent.items as PdfJsTextItem[])
    const baseFontSize = median(lines.map((line) => line.fontSize).filter((value) => value > 0)) || 12

    plainPages.push(buildTextFromLines(lines, 'txt', baseFontSize))
    markdownPages.push(buildTextFromLines(lines, 'md', baseFontSize))
  }

  return {
    pageCount,
    plainText: joinPageText(plainPages, 'txt'),
    markdownText: joinPageText(markdownPages, 'md'),
  }
}

export const buildDownloadFileName = (fileName: string, format: PdfTextExtractorFormat): string => {
  const trimmedName = fileName.replace(/\.pdf$/i, '').trim()
  const baseName = trimmedName.length > 0 ? trimmedName : 'pdf-text'
  return `${baseName}.${format}`
}
