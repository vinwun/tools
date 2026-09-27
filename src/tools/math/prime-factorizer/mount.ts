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
    status: '[data-prime-factorizer-status]',
  })

const syncLocalizedText = (elements: PrimeFactorizerElements, messages: Messages): void => {
  const primeMessages = messages.primeFactorizer
  elements.decimalLabel.textContent = primeMessages.decimalLabel
  elements.decimalHint.textContent = primeMessages.decimalHint
  elements.expandedLabel.textContent = primeMessages.expandedLabel
  elements.expandedHint.textContent = primeMessages.expandedHint
  elements.exponentLabel.textContent = primeMessages.exponentLabel
  elements.exponentHint.textContent = primeMessages.exponentHint
  elements.status.textContent = primeMessages.tooLargeHint
}

const PARSERS: Record<PrimeFactorizerField, (value: string) => bigint | null> = {
  decimal: parseDecimalInput,
  expanded: parseExpandedInput,
  exponent: parseExponentInput,
}

// When the number is too large to factorize, the other fields are emptied.
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
    state.expandedValue = formatted?.expanded ?? ''
    elements.expandedInput.value = state.expandedValue
  }

  if (source !== 'exponent') {
    state.exponentValue = formatted?.exponent ?? ''
    elements.exponentInput.value = state.exponentValue
  }

  elements.status.hidden = formatted !== null
}

export const mountPrimeFactorizer: MountTool = (container, initialMessages) => {
  const elements = queryPrimeFactorizerElements(container)
  if (!elements) {
    return {}
  }

  let messages = initialMessages
  const state = createInitialPrimeFactorizerState()
  let lastValid = { ...state }
  let pendingInputId: number | undefined
  const inputs: Record<PrimeFactorizerField, HTMLInputElement> = {
    decimal: elements.decimalInput,
    expanded: elements.expandedInput,
    exponent: elements.exponentInput,
  }

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

  const handleInput = (field: PrimeFactorizerField): void => {
    state[`${field}Value`] = inputs[field].value
    const parsedValue = PARSERS[field](state[`${field}Value`])
    if (parsedValue !== null) {
      // Also stored when too large, so leaving an emptied field cannot restore stale factors.
      updateOutputs(elements, state, parsedValue, field)
      lastValid = { ...state }
    }
  }

  const revertIfInvalid = (field: PrimeFactorizerField): void => {
    if (PARSERS[field](inputs[field].value) !== null) {
      return
    }

    state[`${field}Value`] = lastValid[`${field}Value`]
    inputs[field].value = lastValid[`${field}Value`]
  }

  for (const field of Object.keys(inputs) as PrimeFactorizerField[]) {
    // Factorizing can take a moment for large numbers, so it waits until typing pauses.
    inputs[field].addEventListener('input', () => {
      clearTimeout(pendingInputId)
      pendingInputId = window.setTimeout(() => handleInput(field), 150)
    })
    inputs[field].addEventListener('blur', () => revertIfInvalid(field))
  }

  syncUi()

  return { updateLocale: syncLocale, destroy: () => clearTimeout(pendingInputId) }
}
