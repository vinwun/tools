import type { Messages } from '../../../i18n/schema.ts'
import type { NumberGeneratorElements, NumberGeneratorState } from './types.ts'
import {
  createInitialNumberGeneratorState,
  formatDecimalResult,
  formatIntegerResult,
  normalizeRange,
  randomDecimalInclusive,
  randomIntegerInclusive,
  resolveDecimalPrecision,
} from './utils.ts'
import { queryRequired } from '../../foundations/dom.ts'
import type { MountTool } from '../../types.ts'
import { parseDecimalNumber, resolveNumberLocale } from '../../foundations/numbers.ts'

const queryNumberGeneratorElements = (container: HTMLElement): NumberGeneratorElements | null =>
  queryRequired<NumberGeneratorElements>(container, {
    form: '[data-rng-number-generator-form]',
    minInput: '[data-rng-number-generator-min]',
    maxInput: '[data-rng-number-generator-max]',
    integerModeInput: '[data-rng-number-generator-mode][value="integer"]',
    decimalModeInput: '[data-rng-number-generator-mode][value="decimal"]',
    resultOutput: '[data-rng-number-generator-result]',
    generateButton: '[data-rng-number-generator-generate]',
    settingsLegend: '[data-rng-number-generator-settings-legend]',
    minLabel: '[data-rng-number-generator-min-label]',
    maxLabel: '[data-rng-number-generator-max-label]',
    integerModeLabel: '[data-rng-number-generator-integer-label]',
    decimalModeLabel: '[data-rng-number-generator-decimal-label]',
  })

const syncLocalizedText = (elements: NumberGeneratorElements, messages: Messages): void => {
  const numberMessages = messages.rngNumberGenerator
  elements.settingsLegend.textContent = numberMessages.settingsLegend
  elements.minLabel.textContent = numberMessages.minLabel
  elements.maxLabel.textContent = numberMessages.maxLabel
  elements.integerModeLabel.textContent = numberMessages.integerModeLabel
  elements.decimalModeLabel.textContent = numberMessages.decimalModeLabel
  elements.generateButton.textContent = numberMessages.generateAction
}

// Formats with the precision stored at generation, so a later mode or locale change keeps the digits.
const formatStoredResult = (state: NumberGeneratorState, locale: string): string => {
  if (state.resultValue === null || state.resultMode === null) {
    return state.resultText
  }

  if (state.resultMode === 'integer') {
    return formatIntegerResult(state.resultValue)
  }

  return formatDecimalResult(state.resultValue, locale, state.resultPrecision)
}

const readCurrentState = (elements: NumberGeneratorElements, state: NumberGeneratorState): void => {
  state.minValue = elements.minInput.value
  state.maxValue = elements.maxInput.value
  state.mode = elements.decimalModeInput.checked ? 'decimal' : 'integer'
}

const generateNumber = (
  elements: NumberGeneratorElements,
  state: NumberGeneratorState,
): void => {
  const locale = resolveNumberLocale()
  readCurrentState(elements, state)

  const minValue = parseDecimalNumber(state.minValue)
  const maxValue = parseDecimalNumber(state.maxValue)
  if (minValue === null || maxValue === null) {
    return
  }

  const [lowerBound, upperBound] = normalizeRange(minValue, maxValue)

  if (state.mode === 'integer') {
    const integerLowerBound = Math.ceil(lowerBound)
    const integerUpperBound = Math.floor(upperBound)

    if (integerLowerBound > integerUpperBound) {
      return
    }

    state.resultMode = 'integer'
    state.resultValue = randomIntegerInclusive(integerLowerBound, integerUpperBound)
    state.resultText = formatStoredResult(state, locale)
  } else {
    state.resultMode = 'decimal'
    state.resultPrecision = resolveDecimalPrecision(state.minValue, state.maxValue)
    state.resultValue = randomDecimalInclusive(lowerBound, upperBound, state.resultPrecision)
    state.resultText = formatStoredResult(state, locale)
  }

  elements.resultOutput.textContent = state.resultText
}

export const mountNumberGenerator: MountTool = (container) => {
  const elements = queryNumberGeneratorElements(container)
  if (!elements) {
    return {}
  }

  const state = createInitialNumberGeneratorState()

  const syncLocale = (nextMessages: Messages): void => {
    syncLocalizedText(elements, nextMessages)
    state.resultText = formatStoredResult(state, resolveNumberLocale())
    elements.resultOutput.textContent = state.resultText
  }

  elements.minInput.addEventListener('input', () => {
    state.minValue = elements.minInput.value
  })

  elements.maxInput.addEventListener('input', () => {
    state.maxValue = elements.maxInput.value
  })

  elements.integerModeInput.addEventListener('change', () => {
    state.mode = 'integer'
  })

  elements.decimalModeInput.addEventListener('change', () => {
    state.mode = 'decimal'
  })

  elements.form.addEventListener('submit', (event) => {
    event.preventDefault()
    generateNumber(elements, state)
  })

  elements.generateButton.addEventListener('click', () => {
    generateNumber(elements, state)
  })

  generateNumber(elements, state)

  return { updateLocale: syncLocale }
}
