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

  const syncAll = (): void => {
    elements.characterInput.value = String.fromCodePoint(state.cp)
    elements.codePointInput.value = formatCodePointHex(state.cp)
    elements.decimalInput.value = String(state.cp)
    elements.binaryInput.value = formatBinary(state.cp)
    elements.octalInput.value = formatOctal(state.cp)
    elements.utf8Input.value = formatUtf8(state.cp)
    elements.utf16Input.value = formatUtf16(state.cp)
    const unicodeMessages = messages.unicodeConverter
    elements.category.textContent = unicodeMessages[CATEGORY_LABEL_KEYS[categorizeCodePoint(state.cp)]]
    elements.ascii.textContent = isAsciiCodePoint(state.cp)
      ? unicodeMessages.asciiYes
      : unicodeMessages.asciiNo
  }

  const updateFromParsed = (cp: number | null): void => {
    if (cp === null) {
      return
    }
    state.cp = cp
    syncAll()
  }

  const resetOnInvalid = (cp: number | null): void => {
    if (cp === null) {
      syncAll()
      return
    }
    updateFromParsed(cp)
  }

  const syncLocale = (nextMessages: Messages): void => {
    messages = nextMessages
    syncLocalizedText(container, messages)
    syncAll()
  }

  elements.characterInput.addEventListener('input', () => {
    resetOnInvalid(parseCharacter(elements.characterInput.value))
  })
  elements.codePointInput.addEventListener('input', () => {
    resetOnInvalid(parseCodePoint(elements.codePointInput.value))
  })
  elements.decimalInput.addEventListener('input', () => {
    resetOnInvalid(parseDecimal(elements.decimalInput.value))
  })
  elements.binaryInput.addEventListener('input', () => {
    resetOnInvalid(parseBinary(elements.binaryInput.value))
  })
  elements.octalInput.addEventListener('input', () => {
    resetOnInvalid(parseOctal(elements.octalInput.value))
  })
  elements.utf8Input.addEventListener('input', () => {
    updateFromParsed(parseUtf8(elements.utf8Input.value))
  })
  elements.utf8Input.addEventListener('blur', () => {
    if (parseUtf8(elements.utf8Input.value) === null) {
      syncAll()
    }
  })
  elements.utf16Input.addEventListener('input', () => {
    updateFromParsed(parseUtf16(elements.utf16Input.value))
  })
  elements.utf16Input.addEventListener('blur', () => {
    if (parseUtf16(elements.utf16Input.value) === null) {
      syncAll()
    }
  })

  syncAll()
  return { updateLocale: syncLocale }
}
