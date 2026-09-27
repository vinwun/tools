import { describe, expect, it, vi } from 'vitest'
import { mergeHyphenatedLines, splitInlineBullets } from './utils.ts'

// pdf.js needs browser globals at import time; these helpers only work on plain strings.
vi.mock('pdfjs-dist', () => ({ getDocument: vi.fn() }))

describe('splitInlineBullets', () => {
  it('splits inline bullets without eating letters', () => {
    expect(splitInlineBullets(['Ich mag • sugar • salt'])).toEqual(['Ich mag', '- sugar', '- salt'])
  })

  it('keeps dashes inside text', () => {
    expect(splitInlineBullets(['Von 1990–2000 lebte er dort'])).toEqual(['Von 1990–2000 lebte er dort'])
  })
})

describe('mergeHyphenatedLines', () => {
  it('joins a word split across lines', () => {
    expect(mergeHyphenatedLines(['Die Zusammen-', 'arbeit klappt'])).toEqual(['Die Zusammenarbeit klappt'])
  })

  it('keeps the hyphen before a capitalized word', () => {
    expect(mergeHyphenatedLines(['Die Software-', 'Entwicklung ist teuer'])).toEqual(['Die Software-Entwicklung ist teuer'])
  })

  it('keeps lines after an empty line apart', () => {
    expect(mergeHyphenatedLines(['Ende-', '', 'neu'])).toEqual(['Ende-', '', 'neu'])
  })
})
