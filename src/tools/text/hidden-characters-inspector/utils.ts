import type { HiddenCharCategory } from './types.ts'
import { splitGraphemes } from '../../foundations/text.ts'

export const EXAMPLE_TEXT =
  'Zero-width:\na\u200Bb\u200Cc\u200Dd\u200Ee\u200Ff\u2060g\u2061h\u2062i\u2063j\u2064k\n\n' +
  'Bidi (Trojan Source):\n \u202E9876 5432\u202C shows reversed\n\u2067hidden dirs\u2069\n\n' +
  'Separator: one\u2028two\u2029three\n\n' +
  'Confusables: \uFF21\u0430\u0435\u043E\u03BF != Aaeoo'

export const createInitialHiddenCharactersInspectorState = (): {
  inputValue: string
} => ({ inputValue: EXAMPLE_TEXT })

const isWhitespaceControl = (cp: number): boolean =>
  cp === 0x09 || cp === 0x0a || cp === 0x0d

const BIDI_CODE_POINTS = new Set<number>([
  0x202a, 0x202b, 0x202c, 0x202d, 0x202e, 0x2066, 0x2067, 0x2068, 0x2069,
])

// Spaces and blanks that look like a normal space or like nothing at all.
const SEPARATOR_CODE_POINTS = new Set<number>([
  0x2028, 0x2029, 0x00a0, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008,
  0x2009, 0x200a, 0x202f, 0x3000, 0x3164, 0x2800,
])

// Invisible marks outside the Cf category: variation selectors and the combining grapheme joiner.
const isInvisibleMark = (cp: number): boolean =>
  (cp >= 0xfe00 && cp <= 0xfe0f) || (cp >= 0xe0100 && cp <= 0xe01ef) || cp === 0x034f

const CONFUSABLE_TARGETS: Record<number, string> = {
  // Cyrillic lookalikes
  0x0410: 'A', 0x0412: 'B', 0x0415: 'E', 0x041a: 'K', 0x041c: 'M', 0x041d: 'H',
  0x041e: 'O', 0x0420: 'P', 0x0421: 'C', 0x0422: 'T', 0x0423: 'Y', 0x0425: 'X',
  0x0406: 'I', 0x0430: 'a', 0x0435: 'e', 0x043e: 'o', 0x0440: 'p', 0x0441: 'c',
  0x0443: 'y', 0x0445: 'x', 0x0456: 'i', 0x0458: 'j', 0x0455: 's',
  // Greek lookalikes
  0x0391: 'A', 0x0392: 'B', 0x0395: 'E', 0x0396: 'Z', 0x0397: 'H', 0x0399: 'I',
  0x039a: 'K', 0x039c: 'M', 0x039d: 'N', 0x039f: 'O', 0x03a1: 'P', 0x03a4: 'T',
  0x03a5: 'Y', 0x03a7: 'X', 0x03b1: 'a', 0x03b2: 'ß', 0x03b5: 'e', 0x03bf: 'o',
  0x03c1: 'p', 0x03c4: 't', 0x03c5: 'u', 0x03c7: 'x',
  // Fullwidth forms (look like ASCII)
  0xff21: 'A', 0xff22: 'B', 0xff23: 'C', 0xff24: 'D', 0xff25: 'E', 0xff26: 'F',
  0xff27: 'G', 0xff28: 'H', 0xff29: 'I', 0xff2a: 'J', 0xff2b: 'K', 0xff2c: 'L',
  0xff2d: 'M', 0xff2e: 'N', 0xff2f: 'O', 0xff30: 'P', 0xff31: 'Q', 0xff32: 'R',
  0xff33: 'S', 0xff34: 'T', 0xff35: 'U', 0xff36: 'V', 0xff37: 'W', 0xff38: 'X',
  0xff39: 'Y', 0xff3a: 'Z', 0xff41: 'a', 0xff42: 'b', 0xff43: 'c', 0xff44: 'd',
  0xff45: 'e', 0xff46: 'f', 0xff47: 'g', 0xff48: 'h', 0xff49: 'i', 0xff4a: 'j',
  0xff4b: 'k', 0xff4c: 'l', 0xff4d: 'm', 0xff4e: 'n', 0xff4f: 'o', 0xff50: 'p',
  0xff51: 'q', 0xff52: 'r', 0xff53: 's', 0xff54: 't', 0xff55: 'u', 0xff56: 'v',
  0xff57: 'w', 0xff58: 'x', 0xff59: 'y', 0xff5a: 'z',
}

export const categorizeHiddenCharacter = (
  cp: number,
): { category: HiddenCharCategory; target?: string } | null => {
  if (BIDI_CODE_POINTS.has(cp)) {
    return { category: 'bidi' }
  }
  if (SEPARATOR_CODE_POINTS.has(cp)) {
    return { category: 'separator' }
  }
  const character = String.fromCodePoint(cp)
  if (/\p{Cc}/u.test(character) && !isWhitespaceControl(cp)) {
    return { category: 'control' }
  }
  if (/\p{Cf}/u.test(character) || isInvisibleMark(cp)) {
    return { category: 'zeroWidth' }
  }
  if (cp > 0x7f && cp in CONFUSABLE_TARGETS) {
    return { category: 'confusable', target: CONFUSABLE_TARGETS[cp] }
  }
  return null
}

export const isHiddenCodePoint = (cp: number): boolean => categorizeHiddenCharacter(cp) !== null

export const toCodePointHex = (cp: number): string =>
  `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`

export type PreviewSegment =
  | { type: 'text'; value: string }
  | { type: 'flagged'; value: string; codePoint: number; category: HiddenCharCategory; target?: string }

const isPictographic = (value: string | undefined): boolean => value !== undefined && /\p{Extended_Pictographic}/u.test(value)

// Inside an emoji the joiner (👨‍👩‍👧) is shown as harmless and the emoji style selector (❤️) not at all.
// A joiner only counts as harmless when an emoji follows it, so "😀\u200Dabc" is still flagged.
const categorizeInGrapheme = (cp: number, grapheme: string, next: string | undefined): ReturnType<typeof categorizeHiddenCharacter> => {
  // Keycaps (1️⃣) end in U+20E3; the England flag is 🏴 plus invisible tag letters and a cancel tag.
  if (!isPictographic(grapheme) && !grapheme.endsWith('⃣')) {
    return categorizeHiddenCharacter(cp)
  }
  if (cp === 0x200d && isPictographic(next)) {
    return { category: 'emojiJoiner' }
  }
  const isFlagTag = cp >= 0xe0020 && cp <= 0xe007f && /^\u{1F3F4}[\u{E0020}-\u{E007E}]+\u{E007F}$/u.test(grapheme)
  return cp === 0xfe0e || cp === 0xfe0f || isFlagTag ? null : categorizeHiddenCharacter(cp)
}

export const splitSegments = (text: string): PreviewSegment[] => {
  const segments: PreviewSegment[] = []
  const characters = splitGraphemes(text).flatMap((grapheme) =>
    Array.from(grapheme).map((character, index, codePoints) => ({ character, grapheme, next: codePoints[index + 1] })),
  )
  for (const { character, grapheme, next } of characters) {
    const codePoint = character.codePointAt(0) ?? 0
    const result = categorizeInGrapheme(codePoint, grapheme, next)
    if (result !== null) {
      segments.push({
        type: 'flagged',
        value: character,
        codePoint,
        category: result.category,
        target: result.target,
      })
      continue
    }
    const last = segments[segments.length - 1]
    if (last && last.type === 'text') {
      last.value += character
    } else {
      segments.push({ type: 'text', value: character })
    }
  }
  return segments
}

export const countHiddenCharacters = (text: string): number =>
  splitSegments(text).filter((segment) => segment.type === 'flagged' && segment.category !== 'emojiJoiner').length
