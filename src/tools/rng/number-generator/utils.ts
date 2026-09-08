import { formatDecimalNumber } from '../../foundations/numbers.ts'
import type {NumberGeneratorState} from './types.ts'

const DEFAULT_MIN_VALUE = '0'
const DEFAULT_MAX_VALUE = '100'
const DEFAULT_RESULT_TEXT = '—'
const MAX_DECIMAL_PRECISION = 10
const MIN_DECIMAL_PRECISION = 2

const hasCryptoRandomValues = (): boolean =>
  typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function'

export const createInitialNumberGeneratorState = (): NumberGeneratorState => ({
  minValue: DEFAULT_MIN_VALUE,
  maxValue: DEFAULT_MAX_VALUE,
  mode: 'integer',
  resultMode: null,
  resultValue: null,
  resultText: DEFAULT_RESULT_TEXT,
})

export const normalizeRange = (minValue: number, maxValue: number): [number, number] =>
  minValue <= maxValue ? [minValue, maxValue] : [maxValue, minValue]

export const randomIntegerInclusive = (minValue: number, maxValue: number): number => {
  const lowerBound = Math.ceil(minValue)
  const upperBound = Math.floor(maxValue)
  const span = upperBound - lowerBound + 1

  if (span <= 0) {
    return lowerBound
  }

  if (!hasCryptoRandomValues() || span > 0x100000000) {
    return lowerBound + Math.floor(Math.random() * span)
  }

  const limit = Math.floor(0x100000000 / span) * span
  const randomBuffer = new Uint32Array(1)
  let randomValue = 0

  do {
    crypto.getRandomValues(randomBuffer)
    randomValue = randomBuffer[0]
  } while (randomValue >= limit)

  return lowerBound + (randomValue % span)
}

export const randomDecimalInclusive = (minValue: number, maxValue: number, precision: number): number => {
  const scale = 10 ** precision
  const lowerBound = Math.round(minValue * scale)
  const upperBound = Math.round(maxValue * scale)
  return randomIntegerInclusive(lowerBound, upperBound) / scale
}

const digitsBeforeSeparator = (value: string): number => {
  const trimmedValue = value.trim().replace(/^[+-]/, '')
  if (trimmedValue.length === 0) {
    return 0
  }

  const integerPart = trimmedValue.split(/[.,]/)[0]
  return integerPart.length
}

export const resolveDecimalPrecision = (minValue: string, maxValue: string): number => {
  const digitsBeforeDecimal = Math.max(digitsBeforeSeparator(minValue), digitsBeforeSeparator(maxValue))
  return Math.max(MIN_DECIMAL_PRECISION, MAX_DECIMAL_PRECISION - digitsBeforeDecimal)
}

export const formatIntegerResult = (value: number): string => String(value)

export const formatDecimalResult = (value: number, locale: string, precision: number): string =>
  formatDecimalNumber(value, locale, {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  })
