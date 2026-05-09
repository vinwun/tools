import type { Messages } from '../../../i18n/schema.ts'
import type {
  AspectRatioCalculatorElements,
  AspectRatioCalculatorState,
} from './types.ts'
import {
  calculateAspectRatio,
  createInitialAspectRatioCalculatorState,
  DEFAULT_RESULT_TEXT,
  resolveNumberLocale,
  type AspectRatioResult,
} from './utils.ts'

const aspectRatioLocaleSyncers = new WeakMap<HTMLElement, (messages: Messages) => void>()

const queryAspectRatioElements = (container: HTMLElement): AspectRatioCalculatorElements | null => {
  const widthInput = container.querySelector<HTMLInputElement>('[data-aspect-ratio-calculator-width]')
  const heightInput = container.querySelector<HTMLInputElement>('[data-aspect-ratio-calculator-height]')
  const reducedOutput = container.querySelector<HTMLOutputElement>('[data-aspect-ratio-calculator-reduced]')
  const decimalOutput = container.querySelector<HTMLOutputElement>('[data-aspect-ratio-calculator-decimal]')
  const widthLabel = container.querySelector<HTMLElement>('[data-aspect-ratio-calculator-width-label]')
  const heightLabel = container.querySelector<HTMLElement>('[data-aspect-ratio-calculator-height-label]')
  const reducedLabel = container.querySelector<HTMLElement>('[data-aspect-ratio-calculator-reduced-label]')
  const decimalLabel = container.querySelector<HTMLElement>('[data-aspect-ratio-calculator-decimal-label]')

  if (
    !widthInput ||
    !heightInput ||
    !reducedOutput ||
    !decimalOutput ||
    !widthLabel ||
    !heightLabel ||
    !reducedLabel ||
    !decimalLabel
  ) {
    return null
  }

  return {
    widthInput,
    heightInput,
    reducedOutput,
    decimalOutput,
    widthLabel,
    heightLabel,
    reducedLabel,
    decimalLabel,
  }
}

const syncLocalizedText = (elements: AspectRatioCalculatorElements, messages: Messages): void => {
  const ratioMessages = messages.aspectRatioCalculator
  elements.widthLabel.textContent = ratioMessages.widthLabel
  elements.heightLabel.textContent = ratioMessages.heightLabel
  elements.reducedLabel.textContent = ratioMessages.reducedLabel
  elements.decimalLabel.textContent = ratioMessages.decimalLabel
}

const applyResult = (
  elements: AspectRatioCalculatorElements,
  state: AspectRatioCalculatorState,
  result: AspectRatioResult | null,
): void => {
  const reducedText = result?.reduced ?? DEFAULT_RESULT_TEXT
  const decimalText = result?.decimal ?? DEFAULT_RESULT_TEXT
  state.reducedText = reducedText
  state.decimalText = decimalText
  elements.reducedOutput.textContent = reducedText
  elements.decimalOutput.textContent = decimalText
}

export const mountAspectRatioCalculator = (
  container: HTMLElement,
  initialMessages: Messages,
): void => {
  const root = container.querySelector<HTMLElement>('[data-aspect-ratio-calculator-root]') ?? container
  const elements = queryAspectRatioElements(container)
  if (!elements) {
    return
  }

  const existingSyncLocale = aspectRatioLocaleSyncers.get(root)
  if (existingSyncLocale) {
    existingSyncLocale(initialMessages)
    return
  }

  let messages = initialMessages
  const state = createInitialAspectRatioCalculatorState()
  let lastValidWidth = state.widthValue
  let lastValidHeight = state.heightValue
  let lastValidResult: AspectRatioResult | null = null

  const syncUi = (): void => {
    syncLocalizedText(elements, messages)
    elements.widthInput.value = state.widthValue
    elements.heightInput.value = state.heightValue
    const result = calculateAspectRatio(state.widthValue, state.heightValue, resolveNumberLocale())
    applyResult(elements, state, result)
    if (result) {
      lastValidWidth = state.widthValue
      lastValidHeight = state.heightValue
      lastValidResult = result
    }
  }

  const syncLocale = (nextMessages: Messages): void => {
    messages = nextMessages
    syncUi()
  }

  aspectRatioLocaleSyncers.set(root, syncLocale)

  const handleInput = (): void => {
    state.widthValue = elements.widthInput.value
    state.heightValue = elements.heightInput.value
    const result = calculateAspectRatio(state.widthValue, state.heightValue, resolveNumberLocale())
    applyResult(elements, state, result)
    if (result) {
      lastValidWidth = state.widthValue
      lastValidHeight = state.heightValue
      lastValidResult = result
    }
  }

  const revertInvalidInput = (): void => {
    const result = calculateAspectRatio(
      elements.widthInput.value,
      elements.heightInput.value,
      resolveNumberLocale(),
    )
    if (result) {
      return
    }

    state.widthValue = lastValidWidth
    state.heightValue = lastValidHeight
    elements.widthInput.value = lastValidWidth
    elements.heightInput.value = lastValidHeight
    applyResult(elements, state, lastValidResult)
  }

  elements.widthInput.addEventListener('input', handleInput)
  elements.heightInput.addEventListener('input', handleInput)
  elements.widthInput.addEventListener('blur', revertInvalidInput)
  elements.heightInput.addEventListener('blur', revertInvalidInput)

  syncUi()
}

export const updateAspectRatioCalculatorLocale = (container: HTMLElement, messages: Messages): void => {
  const root = container.querySelector<HTMLElement>('[data-aspect-ratio-calculator-root]') ?? container
  aspectRatioLocaleSyncers.get(root)?.(messages)
}
