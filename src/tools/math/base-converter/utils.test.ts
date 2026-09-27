import { describe, expect, it } from 'vitest'
import { formatRomanValue, formatValueInBase, parseBaseInput, parseRomanInput, parseValueInBase } from './utils.ts'

describe('base conversion', () => {
  it('converts between bases', () => {
    expect(parseValueInBase('ff', 16)).toBe(255n)
    expect(formatValueInBase(255n, 2)).toBe('11111111')
    expect(parseValueInBase('102', 2)).toBeNull()
  })

  it('keeps the sign of negative values', () => {
    expect(parseValueInBase('-101', 2)).toBe(-5n)
    expect(formatValueInBase(-5n, 2)).toBe('-101')
  })

  it('accepts only bases 2 to 36 while typing', () => {
    expect(parseBaseInput('1')).toBeNull()
    expect(parseBaseInput('16')).toBe(16)
    expect(parseBaseInput('37')).toBeNull()
  })
})

describe('Roman numerals', () => {
  it('formats and parses canonical numerals', () => {
    expect(formatRomanValue(1994n)).toBe('MCMXCIV')
    expect(parseRomanInput('mcmxciv')).toBe(1994n)
  })

  it('rejects non-canonical and out-of-range input', () => {
    expect(parseRomanInput('IIII')).toBeNull()
    expect(formatRomanValue(4000n)).toBe('')
  })
})
