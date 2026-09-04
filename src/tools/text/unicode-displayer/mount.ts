import type { Messages } from '../../../i18n/schema.ts'
import type { UnicodeCategoryKey, UnicodeDisplayerElements } from './types.ts'
import {
  categorizeCodePoint,
  createInitialUnicodeDisplayerState,
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

const unicodeDisplayerLocaleSyncers = new WeakMap<HTMLElement, (messages: Messages) => void>()

const queryUnicodeDisplayerElements = (container: HTMLElement): UnicodeDisplayerElements | null => {
  const characterInput = container.querySelector<HTMLInputElement>('[data-unicode-displayer-character]')
  const codePointInput = container.querySelector<HTMLInputElement>('[data-unicode-displayer-codepoint]')
  const decimalInput = container.querySelector<HTMLInputElement>('[data-unicode-displayer-decimal]')
  const binaryInput = container.querySelector<HTMLInputElement>('[data-unicode-displayer-binary]')
  const octalInput = container.querySelector<HTMLInputElement>('[data-unicode-displayer-octal]')
  const utf8Input = container.querySelector<HTMLInputElement>('[data-unicode-displayer-utf8]')
  const utf16Input = container.querySelector<HTMLInputElement>('[data-unicode-displayer-utf16]')
  const category = container.querySelector<HTMLElement>('[data-unicode-displayer-category]')
  const ascii = container.querySelector<HTMLElement>('[data-unicode-displayer-ascii]')

  if (
    !characterInput ||
    !codePointInput ||
    !decimalInput ||
    !binaryInput ||
    !octalInput ||
    !utf8Input ||
    !utf16Input ||
    !category ||
    !ascii
  ) {
    return null
  }

  return {
    characterInput,
    codePointInput,
    decimalInput,
    binaryInput,
    octalInput,
    utf8Input,
    utf16Input,
    category,
    ascii,
  }
}

const categoryLabelKey = (key: UnicodeCategoryKey): string =>
  `category${key.charAt(0).toUpperCase()}${key.slice(1)}`

const syncLocalizedText = (container: HTMLElement, messages: Messages): void => {
  const unicodeMessages = messages.unicodeDisplayer
  const labelFor = (attr: string): HTMLElement | null =>
    container.querySelector<HTMLElement>(`[data-${attr}-label]`)
  labelFor('unicode-displayer-codepoint')!.textContent = unicodeMessages.codePointLabel
  labelFor('unicode-displayer-decimal')!.textContent = unicodeMessages.decimalLabel
  labelFor('unicode-displayer-binary')!.textContent = unicodeMessages.binaryLabel
  labelFor('unicode-displayer-octal')!.textContent = unicodeMessages.octalLabel
  labelFor('unicode-displayer-utf8')!.textContent = unicodeMessages.utf8Label
  labelFor('unicode-displayer-utf16')!.textContent = unicodeMessages.utf16Label
}

export const mountUnicodeDisplayer = (container: HTMLElement, initialMessages: Messages): void => {
  const root = container.querySelector<HTMLElement>('[data-unicode-displayer-root]') ?? container
  const elements = queryUnicodeDisplayerElements(container)
  if (!elements) {
    return
  }

  let messages = initialMessages
  const state = createInitialUnicodeDisplayerState()

  const syncAll = (): void => {
    elements.characterInput.value = String.fromCodePoint(state.cp)
    elements.codePointInput.value = formatCodePointHex(state.cp)
    elements.decimalInput.value = String(state.cp)
    elements.binaryInput.value = formatBinary(state.cp)
    elements.octalInput.value = formatOctal(state.cp)
    elements.utf8Input.value = formatUtf8(state.cp)
    elements.utf16Input.value = formatUtf16(state.cp)
    const unicodeMessages = messages.unicodeDisplayer
    elements.category.textContent = unicodeMessages[
      categoryLabelKey(categorizeCodePoint(state.cp)) as keyof typeof unicodeMessages
    ] as string
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

  unicodeDisplayerLocaleSyncers.set(root, syncLocale)

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
}

export const updateUnicodeDisplayerLocale = (container: HTMLElement, messages: Messages): void => {
  const root = container.querySelector<HTMLElement>('[data-unicode-displayer-root]') ?? container
  unicodeDisplayerLocaleSyncers.get(root)?.(messages)
}
