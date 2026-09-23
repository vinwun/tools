import type { Messages } from '../../../i18n/schema.ts'
import type { MatrixMultiplierElements } from './types.ts'
import {
  calculateMatrixMultiplierState,
  createInitialMatrixMultiplierState,
} from './utils.ts'
import { queryRequired } from '../../foundations/dom.ts'
import type { MountTool } from '../../types.ts'
import { resolveNumberLocale } from '../../foundations/numbers.ts'

const queryMatrixMultiplierElements = (container: HTMLElement): MatrixMultiplierElements | null =>
  queryRequired<MatrixMultiplierElements>(container, {
    matrixAInput: '[data-matrix-multiplier-a]',
    matrixBInput: '[data-matrix-multiplier-b]',
    output: '[data-matrix-multiplier-output]',
    status: '[data-matrix-multiplier-status]',
    matrixALabel: '[data-matrix-multiplier-a-label]',
    matrixBLabel: '[data-matrix-multiplier-b-label]',
    matrixHint: '[data-matrix-multiplier-hint]',
    resultLabel: '[data-matrix-multiplier-result-label]',
    matrixADimensions: '[data-matrix-multiplier-a-dimensions]',
    matrixBDimensions: '[data-matrix-multiplier-b-dimensions]',
  })

const syncLocalizedText = (elements: MatrixMultiplierElements, messages: Messages): void => {
  const matrixMessages = messages.matrixMultiplier
  elements.matrixALabel.textContent = matrixMessages.matrixALabel
  elements.matrixBLabel.textContent = matrixMessages.matrixBLabel
  elements.matrixHint.textContent = matrixMessages.matrixHint
  elements.resultLabel.textContent = matrixMessages.resultLabel
}

export const mountMatrixMultiplier: MountTool = (container, initialMessages) => {
  const elements = queryMatrixMultiplierElements(container)
  if (!elements) {
    return {}
  }

  let messages = initialMessages
  const state = createInitialMatrixMultiplierState(messages)

  const updateCalculation = (): void => {
    const computed = calculateMatrixMultiplierState(
      state.matrixAValue,
      state.matrixBValue,
      messages,
      resolveNumberLocale(),
    )

    state.outputText = computed.outputText
    state.statusText = computed.statusText
    state.matrixADimensionsText = computed.matrixADimensionsText
    state.matrixBDimensionsText = computed.matrixBDimensionsText

    elements.output.textContent = state.outputText
    elements.status.textContent = state.statusText
    elements.matrixADimensions.textContent = state.matrixADimensionsText
    elements.matrixBDimensions.textContent = state.matrixBDimensionsText
  }

  const syncUi = (): void => {
    syncLocalizedText(elements, messages)
    elements.matrixAInput.value = state.matrixAValue
    elements.matrixBInput.value = state.matrixBValue
    updateCalculation()
  }

  const syncLocale = (nextMessages: Messages): void => {
    messages = nextMessages
    syncUi()
  }

  const handleInput = (): void => {
    state.matrixAValue = elements.matrixAInput.value
    state.matrixBValue = elements.matrixBInput.value
    updateCalculation()
  }

  elements.matrixAInput.addEventListener('input', handleInput)
  elements.matrixBInput.addEventListener('input', handleInput)

  syncUi()

  return { updateLocale: syncLocale }
}
