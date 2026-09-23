import type { Messages } from '../../../i18n/schema.ts'
import type { TextCounterElements, TextCounterState } from './types.ts'
import { countText, createInitialTextCounterState, TEXT_COUNTER_STAT_KEYS } from './utils.ts'
import { queryRequired } from '../../foundations/dom.ts'
import type { MountTool } from '../../types.ts'

type TextCounterStatElements = Pick<TextCounterElements, 'statValues' | 'statLabels'>

const queryStatElements = (container: HTMLElement): TextCounterStatElements | null => {
  const statValues = {} as TextCounterElements['statValues']
  const statLabels = {} as TextCounterElements['statLabels']

  for (const key of TEXT_COUNTER_STAT_KEYS) {
    const valueElement = container.querySelector<HTMLElement>(`[data-text-counter-stat-value="${key}"]`)
    const labelElement = container.querySelector<HTMLElement>(`[data-text-counter-stat-label="${key}"]`)
    if (!valueElement || !labelElement) {
      return null
    }
    statValues[key] = valueElement
    statLabels[key] = labelElement
  }

  return { statValues, statLabels }
}

const updateResults = (elements: TextCounterElements, state: TextCounterState): void => {
  const counts = countText(state.inputValue)
  for (const key of TEXT_COUNTER_STAT_KEYS) {
    elements.statValues[key].textContent = String(counts[key])
  }
}

const syncLocalizedText = (elements: TextCounterElements, messages: Messages): void => {
  const textMessages = messages.textCounter
  elements.inputLabel.textContent = textMessages.inputLabel
  elements.input.placeholder = textMessages.inputPlaceholder
  elements.clearButton.textContent = textMessages.clearAction
  elements.resultsLabel.textContent = textMessages.resultsTitle
  for (const key of TEXT_COUNTER_STAT_KEYS) {
    elements.statLabels[key].textContent = textMessages[key]
  }
}

export const mountTextCounter: MountTool = (container, initialMessages) => {
  const baseElements = queryRequired<Omit<TextCounterElements, keyof TextCounterStatElements>>(container, {
    input: '[data-text-counter-input]',
    clearButton: '[data-text-counter-clear]',
    inputLabel: '[data-text-counter-input-label]',
    resultsLabel: '[data-text-counter-results-label]',
  })
  const statElements = queryStatElements(container)
  if (!baseElements || !statElements) {
    return {}
  }

  const elements: TextCounterElements = { ...baseElements, ...statElements }

  let messages = initialMessages
  const state = createInitialTextCounterState()

  const syncUi = (): void => {
    syncLocalizedText(elements, messages)
    elements.input.value = state.inputValue
    updateResults(elements, state)
  }

  const syncLocale = (nextMessages: Messages): void => {
    messages = nextMessages
    syncUi()
  }

  elements.input.addEventListener('input', () => {
    state.inputValue = elements.input.value
    updateResults(elements, state)
  })

  elements.clearButton.addEventListener('click', () => {
    state.inputValue = ''
    elements.input.value = ''
    updateResults(elements, state)
  })

  syncUi()
  return { updateLocale: syncLocale }
}
