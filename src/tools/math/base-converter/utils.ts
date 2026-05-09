import type { BaseConverterState } from './types.ts'

const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz'
const MIN_BASE = 2
const MAX_BASE = 36
const DEFAULT_DECIMAL_VALUE = '42'
const DEFAULT_CUSTOM_BASE = 12
const MAX_ROMAN_VALUE = 3999

const isIntegerText = (value: string): boolean => /^[-+]?\d+$/.test(value)

export const parseBaseInput = (value: string): number | null => {
  const trimmed = value.trim()
  if (!isIntegerText(trimmed)) {
    return null
  }

  const parsed = Number.parseInt(trimmed, 10)
  if (!Number.isInteger(parsed) || parsed < MIN_BASE || parsed > MAX_BASE) {
    return null
  }

  return parsed
}

export const clampBaseInput = (value: string): number | null => {
  const trimmed = value.trim()
  if (!isIntegerText(trimmed)) {
    return null
  }

  const parsed = Number.parseInt(trimmed, 10)
  if (!Number.isInteger(parsed)) {
    return null
  }

  return Math.min(MAX_BASE, Math.max(MIN_BASE, parsed))
}

export const parseValueInBase = (value: string, base: number): bigint | null => {
  const trimmed = value.trim().toLowerCase()
  if (trimmed.length === 0) {
    return null
  }

  let sign = 1n
  let startIndex = 0

  if (trimmed[0] === '-') {
    sign = -1n
    startIndex = 1
  } else if (trimmed[0] === '+') {
    startIndex = 1
  }

  if (startIndex >= trimmed.length) {
    return null
  }

  const baseValue = BigInt(base)
  let total = 0n

  for (let index = startIndex; index < trimmed.length; index += 1) {
    const digit = DIGITS.indexOf(trimmed[index])
    if (digit < 0 || digit >= base) {
      return null
    }

    total = total * baseValue + BigInt(digit)
  }

  return sign * total
}

export const formatValueInBase = (value: bigint, base: number): string => value.toString(base)

const ROMAN_TOKENS: Array<[number, string]> = [
  [1000, 'M'],
  [900, 'CM'],
  [500, 'D'],
  [400, 'CD'],
  [100, 'C'],
  [90, 'XC'],
  [50, 'L'],
  [40, 'XL'],
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
]

export const formatRomanValue = (value: bigint): string => {
  if (value <= 0n || value > BigInt(MAX_ROMAN_VALUE)) {
    return ''
  }

  let remaining = Number(value)
  let result = ''
  for (const [amount, symbol] of ROMAN_TOKENS) {
    while (remaining >= amount) {
      result += symbol
      remaining -= amount
    }
  }

  return result
}

export const parseRomanInput = (value: string): bigint | null => {
  const trimmed = value.trim().toUpperCase()
  if (trimmed.length === 0) {
    return null
  }

  let remaining = trimmed
  let total = 0

  for (const [amount, symbol] of ROMAN_TOKENS) {
    while (remaining.startsWith(symbol)) {
      total += amount
      remaining = remaining.slice(symbol.length)
    }
  }

  if (remaining.length > 0 || total <= 0 || total > MAX_ROMAN_VALUE) {
    return null
  }

  const normalized = formatRomanValue(BigInt(total))
  if (normalized !== trimmed) {
    return null
  }

  return BigInt(total)
}

export const createInitialBaseConverterState = (): BaseConverterState => {
  const decimalValue = DEFAULT_DECIMAL_VALUE
  const numericValue = parseValueInBase(decimalValue, 10) ?? 0n

  return {
    binaryValue: formatValueInBase(numericValue, 2),
    octalValue: formatValueInBase(numericValue, 8),
    decimalValue,
    hexValue: formatValueInBase(numericValue, 16),
    customBaseValue: String(DEFAULT_CUSTOM_BASE),
    customBase: DEFAULT_CUSTOM_BASE,
    customValue: formatValueInBase(numericValue, DEFAULT_CUSTOM_BASE),
    numericValue,
    romanValue: formatRomanValue(numericValue),
  }
}
