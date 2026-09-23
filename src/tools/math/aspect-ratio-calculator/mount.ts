import type { Messages } from '../../../i18n/schema.ts'
import type {
  AspectRatioCalculatorElements,
  AspectRatioCalculatorState,
} from './types.ts'
import {
  calculateAspectRatio,
  createInitialAspectRatioCalculatorState,
  DEFAULT_RESULT_TEXT,
  type AspectRatioResult,
} from './utils.ts'
import { queryRequired } from '../../foundations/dom.ts'
import type { MountTool } from '../../types.ts'
import { resolveNumberLocale } from '../../foundations/numbers.ts'

const queryAspectRatioElements = (container: HTMLElement): AspectRatioCalculatorElements | null =>
  queryRequired<AspectRatioCalculatorElements>(container, {
    widthInput: '[data-aspect-ratio-calculator-width]',
    heightInput: '[data-aspect-ratio-calculator-height]',
    reducedOutput: '[data-aspect-ratio-calculator-reduced]',
    decimalOutput: '[data-aspect-ratio-calculator-decimal]',
    widthLabel: '[data-aspect-ratio-calculator-width-label]',
    heightLabel: '[data-aspect-ratio-calculator-height-label]',
    reducedLabel: '[data-aspect-ratio-calculator-reduced-label]',
    decimalLabel: '[data-aspect-ratio-calculator-decimal-label]',
  })

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

export const mountAspectRatioCalculator: MountTool = (container, initialMessages) => {
  const elements = queryAspectRatioElements(container)
  if (!elements) {
    return {}
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

  return { updateLocale: syncLocale }
}
