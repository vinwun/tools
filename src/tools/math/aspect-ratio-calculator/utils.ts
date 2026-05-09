import type { AspectRatioCalculatorState } from './types.ts'

const resolveDefaultScreenSize = (): { width: string; height: string } => {
  if (typeof window === 'undefined' || !window.screen) {
    return { width: '16', height: '9' }
  }

  const pixelRatio = Number.isFinite(window.devicePixelRatio) ? window.devicePixelRatio : 1
  const rawWidth = window.screen.width || 16
  const rawHeight = window.screen.height || 9
  const scaledWidth = Math.floor(rawWidth * pixelRatio)
  const scaledHeight = Math.floor(rawHeight * pixelRatio)

  return {
    width: String(scaledWidth || 16),
    height: String(scaledHeight || 9),
  }
}

const { width: DEFAULT_WIDTH_VALUE, height: DEFAULT_HEIGHT_VALUE } = resolveDefaultScreenSize()
export const DEFAULT_RESULT_TEXT = '—'
const MAX_DECIMAL_PLACES = 4

export type AspectRatioResult = {
  reduced: string
  decimal: string
}

type ParsedRatioInput = {
  numericValue: number
  numerator: bigint
  denominator: bigint
}

export const createInitialAspectRatioCalculatorState = (): AspectRatioCalculatorState => ({
  widthValue: DEFAULT_WIDTH_VALUE,
  heightValue: DEFAULT_HEIGHT_VALUE,
  reducedText: DEFAULT_RESULT_TEXT,
  decimalText: DEFAULT_RESULT_TEXT,
})

export const resolveNumberLocale = (): string => document.documentElement.lang || 'en'

const parseRatioInput = (value: string): ParsedRatioInput | null => {
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return null
  }

  const normalized = trimmed.replace(',', '.')
  if (!/^\+?\d+(?:\.\d*)?$/.test(normalized)) {
    return null
  }

  const numericValue = Number(normalized)
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return null
  }

  const [integerPart, fractionalPart = ''] = normalized.split('.')
  const normalizedInteger = integerPart.replace(/^\+/, '')
  const numeratorString = `${normalizedInteger}${fractionalPart}`
  if (numeratorString.length === 0) {
    return null
  }

  const numerator = BigInt(numeratorString)
  const denominator = fractionalPart.length ? 10n ** BigInt(fractionalPart.length) : 1n

  return {
    numericValue,
    numerator,
    denominator,
  }
}

const gcdBigInt = (value: bigint, other: bigint): bigint => {
  let a = value < 0n ? -value : value
  let b = other < 0n ? -other : other

  while (b !== 0n) {
    const remainder = a % b
    a = b
    b = remainder
  }

  return a
}

export const calculateAspectRatio = (
  widthValue: string,
  heightValue: string,
  locale: string = resolveNumberLocale(),
): AspectRatioResult | null => {
  const width = parseRatioInput(widthValue)
  const height = parseRatioInput(heightValue)

  if (!width || !height) {
    return null
  }

  const ratioNumerator = width.numerator * height.denominator
  const ratioDenominator = width.denominator * height.numerator

  if (ratioDenominator === 0n) {
    return null
  }

  const divisor = gcdBigInt(ratioNumerator, ratioDenominator)
  const reducedNumerator = ratioNumerator / divisor
  const reducedDenominator = ratioDenominator / divisor

  const decimalValue = width.numericValue / height.numericValue
  if (!Number.isFinite(decimalValue)) {
    return null
  }

  const decimal = new Intl.NumberFormat(locale, {
    maximumFractionDigits: MAX_DECIMAL_PLACES,
    minimumFractionDigits: 0,
    useGrouping: false,
  }).format(decimalValue)

  return {
    reduced: `${reducedNumerator.toString()}:${reducedDenominator.toString()}`,
    decimal,
  }
}
