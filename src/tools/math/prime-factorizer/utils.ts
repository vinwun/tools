import { isIntegerText } from '../../foundations/numbers.ts'
import type { PrimeFactorizerState } from './types.ts'

type FactorizationFormat = {
  expanded: string
  exponent: string
}

const DEFAULT_DECIMAL_VALUE = '120'
const MAX_EXPONENT = 1000

export const parseDecimalInput = (value: string): bigint | null => {
  const trimmedValue = value.trim()
  if (!isIntegerText(trimmedValue)) {
    return null
  }

  try {
    return BigInt(trimmedValue)
  } catch {
    return null
  }
}

export const parseExpandedInput = (value: string): bigint | null => {
  const trimmedValue = value.trim()
  if (trimmedValue.length === 0) {
    return null
  }

  const parts = trimmedValue
    .split('*')
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length === 0) {
    return null
  }

  let product = 1n
  for (const part of parts) {
    if (!isIntegerText(part)) {
      return null
    }

    const factor = BigInt(part)
    if (factor === 0n) {
      return 0n
    }

    product *= factor
  }

  return product
}

const powBigInt = (base: bigint, exponent: number): bigint => {
  let result = 1n
  let remaining = exponent
  let current = base

  while (remaining > 0) {
    if (remaining % 2 === 1) {
      result *= current
    }
    current *= current
    remaining = Math.floor(remaining / 2)
  }

  return result
}

export const parseExponentInput = (value: string): bigint | null => {
  const trimmedValue = value.trim()
  if (trimmedValue.length === 0) {
    return null
  }

  const parts = trimmedValue
    .split('*')
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length === 0) {
    return null
  }

  let product = 1n
  for (const part of parts) {
    const match = part.match(/^([+-]?)(\d+)(?:\s*\^\s*(\d+))?$/)
    if (!match) {
      return null
    }

    const sign = match[1] === '-' ? -1n : 1n
    const base = BigInt(match[2])
    const exponentText = match[3]
    const exponent = exponentText ? Number(exponentText) : 1

    if (!Number.isInteger(exponent) || exponent < 0 || exponent > MAX_EXPONENT) {
      return null
    }

    if (base === 0n && exponent === 0) {
      return null
    }

    if (base === 0n) {
      return 0n
    }

    const magnitude = powBigInt(base, exponent)
    product *= sign * magnitude
  }

  return product
}

const collectPrimeFactors = (value: bigint): Map<bigint, number> => {
  const factors = new Map<bigint, number>()
  let remaining = value

  if (remaining < 0n) {
    remaining = -remaining
  }

  if (remaining <= 1n) {
    return factors
  }

  let count = 0
  while (remaining % 2n === 0n) {
    remaining /= 2n
    count += 1
  }

  if (count > 0) {
    factors.set(2n, count)
  }

  let factor = 3n
  while (factor * factor <= remaining) {
    count = 0
    while (remaining % factor === 0n) {
      remaining /= factor
      count += 1
    }
    if (count > 0) {
      factors.set(factor, count)
    }
    factor += 2n
  }

  if (remaining > 1n) {
    factors.set(remaining, 1)
  }

  return factors
}

export const formatPrimeFactorization = (value: bigint): FactorizationFormat => {
  if (value === 0n) {
    return { expanded: '0', exponent: '0' }
  }

  const isNegative = value < 0n
  const absoluteValue = isNegative ? -value : value

  if (absoluteValue === 1n) {
    const output = isNegative ? '-1' : '1'
    return { expanded: output, exponent: output }
  }

  const factors = collectPrimeFactors(absoluteValue)
  const expandedParts: string[] = []
  const exponentParts: string[] = []

  if (isNegative) {
    expandedParts.push('-1')
    exponentParts.push('-1')
  }

  for (const [prime, exponent] of factors) {
    for (let index = 0; index < exponent; index += 1) {
      expandedParts.push(String(prime))
    }

    exponentParts.push(exponent > 1 ? `${prime}^${exponent}` : String(prime))
  }

  return {
    expanded: expandedParts.join(' * '),
    exponent: exponentParts.join(' * '),
  }
}

export const createInitialPrimeFactorizerState = (): PrimeFactorizerState => {
  const value = BigInt(DEFAULT_DECIMAL_VALUE)
  const formatted = formatPrimeFactorization(value)

  return {
    decimalValue: DEFAULT_DECIMAL_VALUE,
    expandedValue: formatted.expanded,
    exponentValue: formatted.exponent,
  }
}
