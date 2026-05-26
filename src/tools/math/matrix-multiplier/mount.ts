import type { Messages } from '../../../i18n/schema.ts'
import type { MatrixMultiplierElements } from './types.ts'
import {
  calculateMatrixMultiplierState,
  createInitialMatrixMultiplierState,
  resolveNumberLocale,
} from './utils.ts'

const matrixMultiplierLocaleSyncers = new WeakMap<HTMLElement, (messages: Messages) => void>()

const queryMatrixMultiplierElements = (container: HTMLElement): MatrixMultiplierElements | null => {
  const matrixAInput = container.querySelector<HTMLTextAreaElement>('[data-matrix-multiplier-a]')
  const matrixBInput = container.querySelector<HTMLTextAreaElement>('[data-matrix-multiplier-b]')
  const output = container.querySelector<HTMLPreElement>('[data-matrix-multiplier-output]')
  const status = container.querySelector<HTMLElement>('[data-matrix-multiplier-status]')
  const matrixALabel = container.querySelector<HTMLElement>('[data-matrix-multiplier-a-label]')
  const matrixBLabel = container.querySelector<HTMLElement>('[data-matrix-multiplier-b-label]')
  const matrixHint = container.querySelector<HTMLElement>('[data-matrix-multiplier-hint]')
  const resultLabel = container.querySelector<HTMLElement>('[data-matrix-multiplier-result-label]')
  const matrixADimensions = container.querySelector<HTMLElement>('[data-matrix-multiplier-a-dimensions]')
  const matrixBDimensions = container.querySelector<HTMLElement>('[data-matrix-multiplier-b-dimensions]')

  if (
    !matrixAInput ||
    !matrixBInput ||
    !output ||
    !status ||
    !matrixALabel ||
    !matrixBLabel ||
    !matrixHint ||
    !resultLabel ||
    !matrixADimensions ||
    !matrixBDimensions
  ) {
    return null
  }

  return {
    matrixAInput,
    matrixBInput,
    output,
    status,
    matrixALabel,
    matrixBLabel,
    matrixHint,
    resultLabel,
    matrixADimensions,
    matrixBDimensions,
  }
}

const syncLocalizedText = (elements: MatrixMultiplierElements, messages: Messages): void => {
  const matrixMessages = messages.matrixMultiplier
  elements.matrixALabel.textContent = matrixMessages.matrixALabel
  elements.matrixBLabel.textContent = matrixMessages.matrixBLabel
  elements.matrixHint.textContent = matrixMessages.matrixHint
  elements.resultLabel.textContent = matrixMessages.resultLabel
}

export const mountMatrixMultiplier = (container: HTMLElement, initialMessages: Messages): void => {
  const root = container.querySelector<HTMLElement>('[data-matrix-multiplier-root]') ?? container
  const elements = queryMatrixMultiplierElements(root)
  if (!elements) {
    return
  }

  const existingSyncLocale = matrixMultiplierLocaleSyncers.get(root)
  if (existingSyncLocale) {
    existingSyncLocale(initialMessages)
    return
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

  matrixMultiplierLocaleSyncers.set(root, syncLocale)

  const handleInput = (): void => {
    state.matrixAValue = elements.matrixAInput.value
    state.matrixBValue = elements.matrixBInput.value
    updateCalculation()
  }

  elements.matrixAInput.addEventListener('input', handleInput)
  elements.matrixBInput.addEventListener('input', handleInput)

  syncUi()
}

export const updateMatrixMultiplierLocale = (container: HTMLElement, messages: Messages): void => {
  const root = container.querySelector<HTMLElement>('[data-matrix-multiplier-root]') ?? container
  matrixMultiplierLocaleSyncers.get(root)?.(messages)
}
