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
import { createLocaleSyncRegistry } from '../../foundations/locale-sync.ts'
import { parseDecimalNumber, resolveNumberLocale } from '../../foundations/numbers.ts'

const numberGeneratorLocale = createLocaleSyncRegistry<[Messages]>('[data-rng-number-generator-root]')

const queryNumberGeneratorElements = (container: HTMLElement): NumberGeneratorElements | null => {
  const form = container.querySelector<HTMLFormElement>('[data-rng-number-generator-form]')
  const minInput = container.querySelector<HTMLInputElement>('[data-rng-number-generator-min]')
  const maxInput = container.querySelector<HTMLInputElement>('[data-rng-number-generator-max]')
  const modeInputs = container.querySelectorAll<HTMLInputElement>('[data-rng-number-generator-mode]')
  const resultOutput = container.querySelector<HTMLOutputElement>('[data-rng-number-generator-result]')
  const generateButton = container.querySelector<HTMLButtonElement>('[data-rng-number-generator-generate]')
  const settingsLegend = container.querySelector<HTMLElement>('[data-rng-number-generator-settings-legend]')
  const minLabel = container.querySelector<HTMLElement>('[data-rng-number-generator-min-label]')
  const maxLabel = container.querySelector<HTMLElement>('[data-rng-number-generator-max-label]')
  const integerModeLabel = container.querySelector<HTMLElement>('[data-rng-number-generator-integer-label]')
  const decimalModeLabel = container.querySelector<HTMLElement>('[data-rng-number-generator-decimal-label]')

  if (
    !form ||
    !minInput ||
    !maxInput ||
    modeInputs.length < 2 ||
    !resultOutput ||
    !generateButton ||
    !settingsLegend ||
    !minLabel ||
    !maxLabel ||
    !integerModeLabel ||
    !decimalModeLabel
  ) {
    return null
  }

  return {
    form,
    minInput,
    maxInput,
    integerModeInput: modeInputs[0],
    decimalModeInput: modeInputs[1],
    resultOutput,
    generateButton,
    settingsLegend,
    minLabel,
    maxLabel,
    integerModeLabel,
    decimalModeLabel,
  }
}

const syncLocalizedText = (elements: NumberGeneratorElements, messages: Messages): void => {
  const numberMessages = messages.rngNumberGenerator
  elements.settingsLegend.textContent = numberMessages.settingsLegend
  elements.minLabel.textContent = numberMessages.minLabel
  elements.maxLabel.textContent = numberMessages.maxLabel
  elements.integerModeLabel.textContent = numberMessages.integerModeLabel
  elements.decimalModeLabel.textContent = numberMessages.decimalModeLabel
  elements.generateButton.textContent = numberMessages.generateAction
}

const formatStoredResult = (state: NumberGeneratorState, locale: string, precision = 0): string => {
  if (state.resultValue === null || state.resultMode === null) {
    return state.resultText
  }

  if (state.resultMode === 'integer') {
    return formatIntegerResult(state.resultValue)
  }

  return formatDecimalResult(state.resultValue, locale, precision)
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
    const precision = resolveDecimalPrecision(state.minValue, state.maxValue)
    state.resultValue = randomDecimalInclusive(lowerBound, upperBound, precision)
    state.resultText = formatStoredResult(state, locale, precision)
  }

  elements.resultOutput.textContent = state.resultText
}

export const mountNumberGenerator = (container: HTMLElement, initialMessages: Messages): void => {
  const root = container.querySelector<HTMLElement>('[data-rng-number-generator-root]') ?? container
  const elements = queryNumberGeneratorElements(container)
  if (!elements) {
    return
  }

  let messages = initialMessages
  const state = createInitialNumberGeneratorState()

  const syncUi = (): void => {
    syncLocalizedText(elements, messages)
    const locale = resolveNumberLocale()
    elements.minInput.value = state.minValue
    elements.maxInput.value = state.maxValue
    elements.integerModeInput.checked = state.mode === 'integer'
    elements.decimalModeInput.checked = state.mode === 'decimal'
    if (state.mode === 'integer') {
      state.resultText = formatStoredResult(state, locale)
    } else {
      const precision = resolveDecimalPrecision(state.minValue, state.maxValue)
      state.resultText = formatStoredResult(state, locale, precision)
    }
    elements.resultOutput.textContent = state.resultText
  }

  const syncLocale = (nextMessages: Messages): void => {
    messages = nextMessages
    syncUi()
  }

  numberGeneratorLocale.register(root, syncLocale)

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

  syncUi()
  generateNumber(elements, state)
}

export const updateNumberGeneratorLocale = numberGeneratorLocale.update
