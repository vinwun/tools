import type { Messages } from '../../../i18n/schema.ts'
import type {
  PrimeFactorizerElements,
  PrimeFactorizerField,
  PrimeFactorizerState,
} from './types.ts'
import {
  createInitialPrimeFactorizerState,
  formatPrimeFactorization,
  parseDecimalInput,
  parseExpandedInput,
  parseExponentInput,
} from './utils.ts'

const primeFactorizerLocaleSyncers = new WeakMap<HTMLElement, (messages: Messages) => void>()

const queryPrimeFactorizerElements = (container: HTMLElement): PrimeFactorizerElements | null => {
  const decimalInput = container.querySelector<HTMLInputElement>('[data-prime-factorizer-decimal]')
  const expandedInput = container.querySelector<HTMLInputElement>('[data-prime-factorizer-expanded]')
  const exponentInput = container.querySelector<HTMLInputElement>('[data-prime-factorizer-exponent]')
  const decimalLabel = container.querySelector<HTMLElement>('[data-prime-factorizer-decimal-label]')
  const decimalHint = container.querySelector<HTMLElement>('[data-prime-factorizer-decimal-hint]')
  const expandedLabel = container.querySelector<HTMLElement>('[data-prime-factorizer-expanded-label]')
  const expandedHint = container.querySelector<HTMLElement>('[data-prime-factorizer-expanded-hint]')
  const exponentLabel = container.querySelector<HTMLElement>('[data-prime-factorizer-exponent-label]')
  const exponentHint = container.querySelector<HTMLElement>('[data-prime-factorizer-exponent-hint]')

  if (
    !decimalInput ||
    !expandedInput ||
    !exponentInput ||
    !decimalLabel ||
    !decimalHint ||
    !expandedLabel ||
    !expandedHint ||
    !exponentLabel ||
    !exponentHint
  ) {
    return null
  }

  return {
    decimalInput,
    expandedInput,
    exponentInput,
    decimalLabel,
    decimalHint,
    expandedLabel,
    expandedHint,
    exponentLabel,
    exponentHint,
  }
}

const syncLocalizedText = (elements: PrimeFactorizerElements, messages: Messages): void => {
  const primeMessages = messages.primeFactorizer
  elements.decimalLabel.textContent = primeMessages.decimalLabel
  elements.decimalHint.textContent = primeMessages.decimalHint
  elements.expandedLabel.textContent = primeMessages.expandedLabel
  elements.expandedHint.textContent = primeMessages.expandedHint
  elements.exponentLabel.textContent = primeMessages.exponentLabel
  elements.exponentHint.textContent = primeMessages.exponentHint
}

const updateOutputs = (
  elements: PrimeFactorizerElements,
  state: PrimeFactorizerState,
  value: bigint,
  source: PrimeFactorizerField,
): void => {
  const formatted = formatPrimeFactorization(value)

  if (source !== 'decimal') {
    state.decimalValue = value.toString()
    elements.decimalInput.value = state.decimalValue
  }

  if (source !== 'expanded') {
    state.expandedValue = formatted.expanded
    elements.expandedInput.value = state.expandedValue
  }

  if (source !== 'exponent') {
    state.exponentValue = formatted.exponent
    elements.exponentInput.value = state.exponentValue
  }
}

export const mountPrimeFactorizer = (container: HTMLElement, initialMessages: Messages): void => {
  const root = container.querySelector<HTMLElement>('[data-prime-factorizer-root]') ?? container
  const elements = queryPrimeFactorizerElements(container)
  if (!elements) {
    return
  }

  const existingSyncLocale = primeFactorizerLocaleSyncers.get(root)
  if (existingSyncLocale) {
    existingSyncLocale(initialMessages)
    return
  }

  let messages = initialMessages
  const state = createInitialPrimeFactorizerState()
  let lastValidDecimal = state.decimalValue
  let lastValidExpanded = state.expandedValue
  let lastValidExponent = state.exponentValue

  const syncUi = (): void => {
    syncLocalizedText(elements, messages)
    elements.decimalInput.value = state.decimalValue
    elements.expandedInput.value = state.expandedValue
    elements.exponentInput.value = state.exponentValue
  }

  const syncLocale = (nextMessages: Messages): void => {
    messages = nextMessages
    syncUi()
  }

  primeFactorizerLocaleSyncers.set(root, syncLocale)

  const handleDecimalInput = (): void => {
    state.decimalValue = elements.decimalInput.value
    const parsedValue = parseDecimalInput(state.decimalValue)

    if (parsedValue === null) {
      return
    }

    updateOutputs(elements, state, parsedValue, 'decimal')
    lastValidDecimal = state.decimalValue
    lastValidExpanded = state.expandedValue
    lastValidExponent = state.exponentValue
  }

  const handleExpandedInput = (): void => {
    state.expandedValue = elements.expandedInput.value
    const parsedValue = parseExpandedInput(state.expandedValue)

    if (parsedValue === null) {
      return
    }

    updateOutputs(elements, state, parsedValue, 'expanded')
    lastValidDecimal = state.decimalValue
    lastValidExpanded = state.expandedValue
    lastValidExponent = state.exponentValue
  }

  const handleExponentInput = (): void => {
    state.exponentValue = elements.exponentInput.value
    const parsedValue = parseExponentInput(state.exponentValue)

    if (parsedValue === null) {
      return
    }

    updateOutputs(elements, state, parsedValue, 'exponent')
    lastValidDecimal = state.decimalValue
    lastValidExpanded = state.expandedValue
    lastValidExponent = state.exponentValue
  }

  const revertDecimalIfInvalid = (): void => {
    if (parseDecimalInput(elements.decimalInput.value) !== null) {
      return
    }

    state.decimalValue = lastValidDecimal
    elements.decimalInput.value = lastValidDecimal
  }

  const revertExpandedIfInvalid = (): void => {
    if (parseExpandedInput(elements.expandedInput.value) !== null) {
      return
    }

    state.expandedValue = lastValidExpanded
    elements.expandedInput.value = lastValidExpanded
  }

  const revertExponentIfInvalid = (): void => {
    if (parseExponentInput(elements.exponentInput.value) !== null) {
      return
    }

    state.exponentValue = lastValidExponent
    elements.exponentInput.value = lastValidExponent
  }

  elements.decimalInput.addEventListener('input', handleDecimalInput)
  elements.expandedInput.addEventListener('input', handleExpandedInput)
  elements.exponentInput.addEventListener('input', handleExponentInput)
  elements.decimalInput.addEventListener('blur', revertDecimalIfInvalid)
  elements.expandedInput.addEventListener('blur', revertExpandedIfInvalid)
  elements.exponentInput.addEventListener('blur', revertExponentIfInvalid)

  syncUi()
}

export const updatePrimeFactorizerLocale = (container: HTMLElement, messages: Messages): void => {
  const root = container.querySelector<HTMLElement>('[data-prime-factorizer-root]') ?? container
  primeFactorizerLocaleSyncers.get(root)?.(messages)
}
