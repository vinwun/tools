import type { UnicodeCategoryKey, UnicodeConverterState } from './types.ts'
import { splitGraphemes } from '../../foundations/text.ts'

export const DEFAULT_CODE_POINT = 0x41

export const createInitialUnicodeConverterState = (): UnicodeConverterState => ({
  cp: DEFAULT_CODE_POINT,
})

const isValidCodePoint = (cp: number): boolean =>
  cp >= 0 && cp <= 0x10ffff && !(cp >= 0xd800 && cp <= 0xdfff)

export const toPointDetails = (cp: number): { utf8Bytes: number[]; utf16Units: number[] } => {
  const character = String.fromCodePoint(cp)
  const utf16Units: number[] = []
  for (let index = 0; index < character.length; index += 1) {
    utf16Units.push(character.charCodeAt(index))
  }
  return { utf8Bytes: toUtf8Bytes(cp), utf16Units }
}

const toUtf8Bytes = (cp: number): number[] => {
  if (cp <= 0x7f) {
    return [cp]
  }
  if (cp <= 0x7ff) {
    return [0xc0 | (cp >> 6), 0x80 | (cp & 0x3f)]
  }
  if (cp <= 0xffff) {
    return [0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f)]
  }
  return [
    0xf0 | (cp >> 18),
    0x80 | ((cp >> 12) & 0x3f),
    0x80 | ((cp >> 6) & 0x3f),
    0x80 | (cp & 0x3f),
  ]
}

const isContinuation = (byte: number): boolean => (byte & 0xc0) === 0x80

export const decodeUtf8Bytes = (bytes: number[]): number[] | null => {
  const points: number[] = []
  let index = 0
  while (index < bytes.length) {
    const first = bytes[index]
    if (first < 0x80) {
      points.push(first)
      index += 1
      continue
    }
    let length = 0
    if ((first & 0xe0) === 0xc0) {
      length = 2
    } else if ((first & 0xf0) === 0xe0) {
      length = 3
    } else if ((first & 0xf8) === 0xf0) {
      length = 4
    } else {
      return null
    }
    if (index + length > bytes.length) {
      return null
    }
    for (let offset = 1; offset < length; offset += 1) {
      if (!isContinuation(bytes[index + offset])) {
        return null
      }
    }
    let cp = first & (0xff >> (length + 1))
    for (let offset = 1; offset < length; offset += 1) {
      cp = (cp << 6) | (bytes[index + offset] & 0x3f)
    }
    if (!isValidCodePoint(cp)) {
      return null
    }
    points.push(cp)
    index += length
  }
  return points
}

export const decodeUtf16Units = (units: number[]): number[] | null => {
  const points: number[] = []
  let index = 0
  while (index < units.length) {
    const unit = units[index]
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const low = units[index + 1]
      if (low === undefined || low < 0xdc00 || low > 0xdfff) {
        return null
      }
      points.push(0x10000 + ((unit - 0xd800) << 10) + (low - 0xdc00))
      index += 2
      continue
    }
    if (unit >= 0xdc00 && unit <= 0xdfff) {
      return null
    }
    points.push(unit)
    index += 1
  }
  return points
}

export const categorizeCodePoint = (cp: number): UnicodeCategoryKey => {
  const character = String.fromCodePoint(cp)
  if (/\p{C}/u.test(character)) {
    return 'control'
  }
  if (/\p{Z}/u.test(character)) {
    return 'whitespace'
  }
  if (/\p{N}/u.test(character)) {
    return 'digit'
  }
  if (/\p{L}/u.test(character)) {
    return 'letter'
  }
  if (/\p{P}/u.test(character)) {
    return 'punctuation'
  }
  if (/\p{S}/u.test(character)) {
    return 'symbol'
  }
  return 'other'
}

export const isAsciiCodePoint = (cp: number): boolean => cp <= 0x7f

const formatHexValue = (value: number, digits = 2): string => value.toString(16).toUpperCase().padStart(digits, '0')

export const formatCodePointHex = (cp: number): string =>
  `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`

export const formatBinary = (cp: number): string => cp.toString(2)

export const formatOctal = (cp: number): string => cp.toString(8)

export const formatUtf8 = (cp: number): string => toUtf8Bytes(cp).map(formatHexValue).join(' ')

export const formatUtf16 = (cp: number): string =>
  toPointDetails(cp).utf16Units.map((unit) => formatHexValue(unit, 4)).join(' ')

export const parseCharacter = (value: string): number | null => {
  // The last typed character wins; its first code point is the base ("❤️" is U+2764, not U+FE0F).
  const cp = splitGraphemes(value).at(-1)?.codePointAt(0) ?? -1
  return isValidCodePoint(cp) ? cp : null
}

export const parseCodePoint = (value: string): number | null => {
  const match = value.trim().match(/^(?:[Uu]\+|0[xX])?([0-9a-fA-F]+)$/)
  if (!match) {
    return null
  }
  const cp = Number.parseInt(match[1], 16)
  return isValidCodePoint(cp) ? cp : null
}

export const parseDecimal = (value: string): number | null => {
  if (!/^[0-9]{1,7}$/.test(value.trim())) {
    return null
  }
  const cp = Number.parseInt(value.trim(), 10)
  return isValidCodePoint(cp) ? cp : null
}

export const parseBinary = (value: string): number | null => {
  const match = value.trim().match(/^(?:0[bB])?([01]+)$/)
  if (!match) {
    return null
  }
  const cp = Number.parseInt(match[1], 2)
  return isValidCodePoint(cp) ? cp : null
}

export const parseOctal = (value: string): number | null => {
  const match = value.trim().match(/^(?:0[oO])?([0-7]+)$/)
  if (!match) {
    return null
  }
  const cp = Number.parseInt(match[1], 8)
  return isValidCodePoint(cp) ? cp : null
}

export const parseUtf8 = (value: string): number | null => {
  const tokens = value.trim().split(/[\s,]+/).filter(Boolean)
  if (tokens.length === 0 || !tokens.every((token) => /^[0-9a-fA-F]{2}$/.test(token))) {
    return null
  }
  const points = decodeUtf8Bytes(tokens.map((token) => Number.parseInt(token, 16)))
  return points !== null && points.length === 1 ? points[0] : null
}

export const parseUtf16 = (value: string): number | null => {
  const tokens = value.trim().split(/[\s,]+/).filter(Boolean)
  if (tokens.length === 0 || !tokens.every((token) => /^[0-9a-fA-F]{4}$/.test(token))) {
    return null
  }
  const points = decodeUtf16Units(tokens.map((token) => Number.parseInt(token, 16)))
  return points !== null && points.length === 1 ? points[0] : null
}
