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
import { queryRequired } from '../../foundations/dom.ts'
import type { MountTool } from '../../types.ts'

const queryPrimeFactorizerElements = (container: HTMLElement): PrimeFactorizerElements | null =>
  queryRequired<PrimeFactorizerElements>(container, {
    decimalInput: '[data-prime-factorizer-decimal]',
    expandedInput: '[data-prime-factorizer-expanded]',
    exponentInput: '[data-prime-factorizer-exponent]',
    decimalLabel: '[data-prime-factorizer-decimal-label]',
    decimalHint: '[data-prime-factorizer-decimal-hint]',
    expandedLabel: '[data-prime-factorizer-expanded-label]',
    expandedHint: '[data-prime-factorizer-expanded-hint]',
    exponentLabel: '[data-prime-factorizer-exponent-label]',
    exponentHint: '[data-prime-factorizer-exponent-hint]',
  })

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

export const mountPrimeFactorizer: MountTool = (container, initialMessages) => {
  const elements = queryPrimeFactorizerElements(container)
  if (!elements) {
    return {}
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

  return { updateLocale: syncLocale }
}
