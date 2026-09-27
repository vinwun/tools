import { describe, expect, it } from 'vitest'
import { buildFormatDisplayFromNumber, FLOATING_POINT_FORMATS, parseDecimalInput } from './utils.ts'

const [half, float, double] = FLOATING_POINT_FORMATS
const bits = (display: { sign: string; exponent: string; mantissa: string }): string =>
  `${display.sign} ${display.exponent} ${display.mantissa}`

describe('buildFormatDisplayFromNumber', () => {
  it('encodes normal values in all formats', () => {
    expect(bits(buildFormatDisplayFromNumber(half, 1))).toBe('0 01111 0000000000')
    expect(bits(buildFormatDisplayFromNumber(float, -2))).toBe('1 10000000 00000000000000000000000')
    expect(buildFormatDisplayFromNumber(double, 0.1).value).toBe(0.1)
  })

  it('carries a rounded-up subnormal into the smallest normal half', () => {
    const display = buildFormatDisplayFromNumber(half, 6.102e-5)
    expect(bits(display)).toBe('0 00001 0000000000')
    expect(display.interpretation).toBe('normal')
  })

  it('rounds half only once', () => {
    expect(buildFormatDisplayFromNumber(half, 1 + 2 ** -11 + 2 ** -40).value).toBe(1 + 2 ** -10)
  })

  it('handles Infinity and NaN', () => {
    expect(buildFormatDisplayFromNumber(half, 70000).interpretation).toBe('infinity')
    expect(buildFormatDisplayFromNumber(float, Number.NaN).interpretation).toBe('nan')
  })
})

describe('parseDecimalInput', () => {
  it('accepts the non-finite literals in any case', () => {
    expect(parseDecimalInput('infinity')).toBe(Infinity)
    expect(parseDecimalInput('-Infinity')).toBe(-Infinity)
    expect(parseDecimalInput('NaN')).toBeNaN()
  })
})
