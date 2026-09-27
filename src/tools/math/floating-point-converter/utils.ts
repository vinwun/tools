import type {
  FloatingPointFormatDisplay,
  FloatingPointFormatId,
  FloatingPointConverterState,
  FloatingPointInterpretation,
} from './types.ts'
import type { Messages } from '../../../i18n/schema.ts'
import { localizeDecimalSeparator, parseDecimalNumber, resolveNumberLocale } from '../../foundations/numbers.ts'

type FloatingPointFormat = {
  id: FloatingPointFormatId
  exponentBits: number
  mantissaBits: number
}

export const FLOATING_POINT_FORMATS: FloatingPointFormat[] = [
  { id: 'half', exponentBits: 5, mantissaBits: 10 },
  { id: 'float', exponentBits: 8, mantissaBits: 23 },
  { id: 'double', exponentBits: 11, mantissaBits: 52 },
]

const DEFAULT_DECIMAL_VALUE = '314.159265'

const float32View = new DataView(new ArrayBuffer(4))
const float64View = new DataView(new ArrayBuffer(8))

const float32ToBits = (value: number): number => {
  float32View.setFloat32(0, value, false)
  return float32View.getUint32(0, false)
}

const bitsToFloat32 = (bits: number): number => {
  float32View.setUint32(0, bits, false)
  return float32View.getFloat32(0, false)
}

const float64ToBits = (value: number): bigint => {
  float64View.setFloat64(0, value, false)
  return float64View.getBigUint64(0, false)
}

const bitsToFloat64 = (bits: bigint): number => {
  float64View.setBigUint64(0, bits, false)
  return float64View.getFloat64(0, false)
}

// Rounds half to even, as IEEE 754 does; exact for the scaled values used below.
const roundHalfToEven = (value: number): number => {
  const floor = Math.floor(value)
  const fraction = value - floor
  return fraction > 0.5 || (fraction === 0.5 && floor % 2 !== 0) ? floor + 1 : floor
}

// Works on the float64 value directly: going through float32 first would round twice.
const numberToHalfBits = (value: number): number => {
  if (Number.isNaN(value)) {
    return 0x7e00
  }

  const sign = value < 0 || Object.is(value, -0) ? 0x8000 : 0
  const magnitude = Math.abs(value)

  if (magnitude < 2 ** -14) {
    // A subnormal that rounds up to 0x400 carries into the smallest normal, so it stays unmasked.
    return sign | roundHalfToEven(magnitude * 2 ** 24)
  }

  let exponent = Math.floor(Math.log2(magnitude))
  if (2 ** exponent > magnitude) exponent -= 1
  if (2 ** (exponent + 1) <= magnitude) exponent += 1

  let mantissa = roundHalfToEven((magnitude / 2 ** exponent - 1) * 1024)
  if (mantissa === 1024) {
    mantissa = 0
    exponent += 1
  }

  return exponent + 15 >= 0x1f ? sign | 0x7c00 : sign | ((exponent + 15) << 10) | mantissa
}

const halfBitsToNumber = (bits: number): number => {
  const sign = (bits >>> 15) & 0x1
  const exponent = (bits >>> 10) & 0x1f
  const mantissa = bits & 0x3ff
  const signValue = sign === 1 ? -1 : 1

  if (exponent === 0) {
    if (mantissa === 0) {
      return sign === 1 ? -0 : 0
    }

    const fraction = mantissa / 2 ** 10
    return signValue * 2 ** (1 - 15) * fraction
  }

  if (exponent === 0x1f) {
    if (mantissa === 0) {
      return sign === 1 ? -Infinity : Infinity
    }

    return Number.NaN
  }

  const fraction = 1 + mantissa / 2 ** 10
  return signValue * 2 ** (exponent - 15) * fraction
}

const normalizeBitInput = (value: string, length: number): string | null => {
  const normalized = value.replace(/\s+/g, '')
  if (normalized.length !== length) {
    return null
  }
  if (!/^[01]+$/.test(normalized)) {
    return null
  }
  return normalized
}

const getInterpretation = (exponentBits: string, mantissaBits: string): FloatingPointInterpretation => {
  const exponentAllZero = /^0+$/.test(exponentBits)
  const exponentAllOne = /^1+$/.test(exponentBits)
  const mantissaAllZero = /^0+$/.test(mantissaBits)

  if (exponentAllZero) {
    return mantissaAllZero ? 'zero' : 'subnormal'
  }

  if (exponentAllOne) {
    return mantissaAllZero ? 'infinity' : 'nan'
  }

  return 'normal'
}

const buildDisplay = (
  signBits: string,
  exponentBits: string,
  mantissaBits: string,
  value: number,
): FloatingPointFormatDisplay => {
  return {
    sign: signBits,
    exponent: exponentBits,
    mantissa: mantissaBits,
    value,
    interpretation: getInterpretation(exponentBits, mantissaBits),
  }
}

const NON_FINITE_INPUTS = new Set(['nan', 'infinity', '-infinity', '+infinity'])

export const parseDecimalInput = (value: string): number | null => {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  // NaN and the infinities are typed literally here, so they bypass the numeric parser.
  const lower = trimmed.toLowerCase()
  if (NON_FINITE_INPUTS.has(lower)) {
    return lower === 'nan' ? Number.NaN : lower.startsWith('-') ? -Infinity : Infinity
  }

  return parseDecimalNumber(trimmed)
}

const expandExponential = (value: string): string => {
  const match = value.match(/^([+-]?)(\d+(?:\.\d+)?)[eE]([+-]?\d+)$/)
  if (!match) {
    return value
  }

  const sign = match[1] ?? ''
  const mantissa = match[2]
  const exponent = Number(match[3])
  if (!Number.isFinite(exponent)) {
    return value
  }

  const [intPart, fracPart = ''] = mantissa.split('.')
  const digits = `${intPart}${fracPart}`
  const shift = exponent - fracPart.length

  if (shift >= 0) {
    return `${sign}${digits}${'0'.repeat(shift)}`
  }

  const position = digits.length + shift
  if (position > 0) {
    return `${sign}${digits.slice(0, position)}.${digits.slice(position)}`
  }

  return `${sign}0.${'0'.repeat(-position)}${digits}`
}

const formatNumberPlain = (value: number): string => {
  const raw = String(value)
  return raw.includes('e') || raw.includes('E') ? expandExponential(raw) : raw
}

const trimTrailingZeros = (value: string): string => {
  if (!value.includes('.')) {
    return value
  }

  let trimmed = value.replace(/0+$/, '')
  if (trimmed.endsWith('.')) {
    trimmed = trimmed.slice(0, -1)
  }

  if (trimmed === '' || trimmed === '-') {
    return '0'
  }

  return trimmed
}

const trimExponentialMantissa = (value: string): string => {
  const [mantissa, exponent] = value.split(/e/i)
  const trimmedMantissa = trimTrailingZeros(mantissa)
  return `${trimmedMantissa}e${exponent}`
}

const clampPrecision = (precision: number): number => Math.min(Math.max(precision, 2), 15)

const leadingMagnitude = (value: number): number => {
  if (!Number.isFinite(value) || value === 0) {
    return 0
  }

  return Math.floor(Math.log10(Math.abs(value)))
}

// Emits the exact digits with a '.' separator; use `localizeDecimalNumber` for display.
export const formatNumber = (value: number, precision?: number): string => {
  if (Number.isNaN(value)) {
    return 'NaN'
  }
  if (value === Infinity) {
    return 'Infinity'
  }
  if (value === -Infinity) {
    return '-Infinity'
  }
  if (Object.is(value, -0)) {
    return '-0'
  }
  if (precision !== undefined && Number.isFinite(value)) {
    const formatted = value.toPrecision(precision)
    if (formatted.includes('e') || formatted.includes('E')) {
      return trimExponentialMantissa(formatted)
    }
    return trimTrailingZeros(formatted)
  }
  return formatNumberPlain(value)
}

export const localizeDecimalNumber = (value: number, locale: string, precision?: number): string =>
  localizeDecimalSeparator(formatNumber(value, precision), locale)

export const formatDelta = (decimalValue: number, formatValue: number, locale: string): string => {
  if (!Number.isFinite(decimalValue) || !Number.isFinite(formatValue)) {
    return '—'
  }

  const delta = formatValue - decimalValue
  if (Object.is(delta, -0) || delta === 0) {
    return '0'
  }

  const formatted = delta.toPrecision(5)
  const plain = formatted.includes('e') || formatted.includes('E')
    ? trimExponentialMantissa(formatted)
    : trimTrailingZeros(formatted)

  return localizeDecimalSeparator(plain, locale)
}

export const formatValueWithDelta = (
  decimalValue: number,
  formatValue: number,
  locale: string,
): string => {
  if (!Number.isFinite(formatValue)) {
    return formatNumber(formatValue)
  }

  const delta = formatValue - decimalValue
  if (Object.is(delta, -0) || delta === 0) {
    return localizeDecimalNumber(formatValue, locale)
  }

  const magnitude = leadingMagnitude(formatValue)
  const deltaMagnitude = leadingMagnitude(delta)
  const precision = clampPrecision(magnitude - deltaMagnitude + 2)

  return localizeDecimalNumber(formatValue, locale, precision)
}

export const buildFormatDisplayFromNumber = (
  format: FloatingPointFormat,
  value: number,
): FloatingPointFormatDisplay => {
  if (format.id === 'half') {
    const rawBits = numberToHalfBits(value)
    const sign = (rawBits >>> 15) & 0x1
    const exponent = (rawBits >>> 10) & 0x1f
    const mantissa = rawBits & 0x3ff
    const signBits = String(sign)
    const exponentBits = exponent.toString(2).padStart(format.exponentBits, '0')
    const mantissaBits = mantissa.toString(2).padStart(format.mantissaBits, '0')
    const storedValue = halfBitsToNumber(rawBits)

    return buildDisplay(signBits, exponentBits, mantissaBits, storedValue)
  }

  if (format.id === 'float') {
    const rawBits = float32ToBits(value)
    const sign = (rawBits >>> 31) & 0x1
    const exponent = (rawBits >>> 23) & 0xff
    const mantissa = rawBits & 0x7fffff
    const signBits = String(sign)
    const exponentBits = exponent.toString(2).padStart(format.exponentBits, '0')
    const mantissaBits = mantissa.toString(2).padStart(format.mantissaBits, '0')
    const storedValue = bitsToFloat32(rawBits)

    return buildDisplay(signBits, exponentBits, mantissaBits, storedValue)
  }

  const rawBits = float64ToBits(value)
  const sign = Number((rawBits >> 63n) & 0x1n)
  const exponent = Number((rawBits >> 52n) & 0x7ffn)
  const mantissa = rawBits & 0xfffffffffffffn
  const signBits = String(sign)
  const exponentBits = exponent.toString(2).padStart(format.exponentBits, '0')
  const mantissaBits = mantissa.toString(2).padStart(format.mantissaBits, '0')
  const storedValue = bitsToFloat64(rawBits)

  return buildDisplay(signBits, exponentBits, mantissaBits, storedValue)
}

export const buildFormatDisplayFromInputs = (
  format: FloatingPointFormat,
  signInput: string,
  exponentInput: string,
  mantissaInput: string,
): FloatingPointFormatDisplay | null => {
  const signBits = normalizeBitInput(signInput, 1)
  const exponentBits = normalizeBitInput(exponentInput, format.exponentBits)
  const mantissaBits = normalizeBitInput(mantissaInput, format.mantissaBits)

  if (!signBits || !exponentBits || !mantissaBits) {
    return null
  }

  if (format.id === 'half') {
    const sign = Number.parseInt(signBits, 2)
    const exponent = Number.parseInt(exponentBits, 2)
    const mantissa = Number.parseInt(mantissaBits, 2)
    const rawBits = (sign << 15) | (exponent << 10) | mantissa
    const value = halfBitsToNumber(rawBits)

    return buildDisplay(signBits, exponentBits, mantissaBits, value)
  }

  if (format.id === 'float') {
    const sign = Number.parseInt(signBits, 2)
    const exponent = Number.parseInt(exponentBits, 2)
    const mantissa = Number.parseInt(mantissaBits, 2)
    const rawBits = (sign << 31) | (exponent << 23) | mantissa
    const value = bitsToFloat32(rawBits)

    return buildDisplay(signBits, exponentBits, mantissaBits, value)
  }

  const sign = BigInt(Number.parseInt(signBits, 2))
  const exponent = BigInt(Number.parseInt(exponentBits, 2))
  const mantissa = BigInt(`0b${mantissaBits}`)
  const rawBits = (sign << 63n) | (exponent << 52n) | mantissa
  const value = bitsToFloat64(rawBits)

  return buildDisplay(signBits, exponentBits, mantissaBits, value)
}

export const createInitialFloatingPointConverterState = (
  locale: string = resolveNumberLocale(),
): FloatingPointConverterState => {
  const decimalNumber = Number(DEFAULT_DECIMAL_VALUE)
  const decimalValue = localizeDecimalNumber(decimalNumber, locale)
  const formats = Object.fromEntries(
    FLOATING_POINT_FORMATS.map((format) => [format.id, buildFormatDisplayFromNumber(format, decimalNumber)]),
  ) as Record<FloatingPointFormatId, FloatingPointFormatDisplay>

  return {
    decimalValue,
    decimalNumber,
    formats,
  }
}

export const getInterpretationLabel = (messages: Messages, key: FloatingPointInterpretation): string => {
  const lookup: Record<FloatingPointInterpretation, string> = {
    zero: messages.floatingPointConverter.interpretationZero,
    subnormal: messages.floatingPointConverter.interpretationSubnormal,
    normal: messages.floatingPointConverter.interpretationNormal,
    infinity: messages.floatingPointConverter.interpretationInfinity,
    nan: messages.floatingPointConverter.interpretationNaN,
  }

  return lookup[key]
}
