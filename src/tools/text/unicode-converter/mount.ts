import type { Messages } from '../../../i18n/schema.ts'
import type { UnicodeCategoryKey, UnicodeConverterElements } from './types.ts'
import {
  categorizeCodePoint,
  createInitialUnicodeConverterState,
  formatBinary,
  formatCodePointHex,
  formatOctal,
  formatUtf16,
  formatUtf8,
  isAsciiCodePoint,
  parseBinary,
  parseCharacter,
  parseCodePoint,
  parseDecimal,
  parseOctal,
  parseUtf8,
  parseUtf16,
} from './utils.ts'
import { queryRequired } from '../../foundations/dom.ts'
import type { MountTool } from '../../types.ts'

type UnicodeMessages = Messages['unicodeConverter']

const CATEGORY_LABEL_KEYS: Record<UnicodeCategoryKey, keyof UnicodeMessages> = {
  letter: 'categoryLetter',
  digit: 'categoryDigit',
  punctuation: 'categoryPunctuation',
  symbol: 'categorySymbol',
  whitespace: 'categoryWhitespace',
  control: 'categoryControl',
  other: 'categoryOther',
}

const FIELD_LABEL_KEYS = [
  ['codepoint', 'codePointLabel'],
  ['decimal', 'decimalLabel'],
  ['binary', 'binaryLabel'],
  ['octal', 'octalLabel'],
  ['utf8', 'utf8Label'],
  ['utf16', 'utf16Label'],
  ['category', 'categoryLabel'],
  ['ascii', 'asciiLabel'],
] as const satisfies readonly (readonly [string, keyof UnicodeMessages])[]

const syncLocalizedText = (container: HTMLElement, messages: Messages): void => {
  for (const [field, key] of FIELD_LABEL_KEYS) {
    const label = container.querySelector<HTMLElement>(`[data-unicode-converter-${field}-label]`)
    if (label) {
      label.textContent = messages.unicodeConverter[key]
    }
  }
}

export const mountUnicodeConverter: MountTool = (container, initialMessages) => {
  const elements = queryRequired<UnicodeConverterElements>(container, {
    characterInput: '[data-unicode-converter-character]',
    codePointInput: '[data-unicode-converter-codepoint]',
    decimalInput: '[data-unicode-converter-decimal]',
    binaryInput: '[data-unicode-converter-binary]',
    octalInput: '[data-unicode-converter-octal]',
    utf8Input: '[data-unicode-converter-utf8]',
    utf16Input: '[data-unicode-converter-utf16]',
    category: '[data-unicode-converter-category]',
    ascii: '[data-unicode-converter-ascii]',
  })
  if (!elements) {
    return {}
  }

  let messages = initialMessages
  const state = createInitialUnicodeConverterState()

  // The field being typed in is skipped, so partial input like "U+" is not overwritten.
  const syncAll = (skip?: HTMLInputElement): void => {
    const values: Array<[HTMLInputElement, string]> = [
      [elements.characterInput, String.fromCodePoint(state.cp)],
      [elements.codePointInput, formatCodePointHex(state.cp)],
      [elements.decimalInput, String(state.cp)],
      [elements.binaryInput, formatBinary(state.cp)],
      [elements.octalInput, formatOctal(state.cp)],
      [elements.utf8Input, formatUtf8(state.cp)],
      [elements.utf16Input, formatUtf16(state.cp)],
    ]
    values.forEach(([input, value]) => {
      if (input !== skip) input.value = value
    })
    const unicodeMessages = messages.unicodeConverter
    elements.category.textContent = unicodeMessages[CATEGORY_LABEL_KEYS[categorizeCodePoint(state.cp)]]
    elements.ascii.textContent = isAsciiCodePoint(state.cp)
      ? unicodeMessages.asciiYes
      : unicodeMessages.asciiNo
  }

  const syncLocale = (nextMessages: Messages): void => {
    messages = nextMessages
    syncLocalizedText(container, messages)
    elements.characterInput.setAttribute('aria-label', messages.unicodeConverter.characterLabel)
    syncAll()
  }

  const fields: Array<[HTMLInputElement, (value: string) => number | null]> = [
    [elements.characterInput, parseCharacter],
    [elements.codePointInput, parseCodePoint],
    [elements.decimalInput, parseDecimal],
    [elements.binaryInput, parseBinary],
    [elements.octalInput, parseOctal],
    [elements.utf8Input, parseUtf8],
    [elements.utf16Input, parseUtf16],
  ]
  for (const [input, parse] of fields) {
    input.addEventListener('input', () => {
      const cp = parse(input.value)
      if (cp !== null) {
        state.cp = cp
        // The character field is cut to one character right away, as it shows a single character.
        syncAll(input === elements.characterInput ? undefined : input)
      }
    })
    // Leaving the field normalizes it, or restores it when the input was invalid.
    input.addEventListener('blur', () => syncAll())
  }

  syncAll()
  return { updateLocale: syncLocale }
}
