import type { Messages } from '../../../i18n/schema.ts'
import type { TextCounterElements, TextCounterState } from './types.ts'
import { countText, createInitialTextCounterState, TEXT_COUNTER_STAT_KEYS } from './utils.ts'
import { createLocaleSyncRegistry } from '../../foundations/locale-sync.ts'

const textCounterLocale = createLocaleSyncRegistry<[Messages]>('[data-text-counter-root]')

const queryTextCounterElements = (container: HTMLElement): TextCounterElements | null => {
  const form = container.querySelector<HTMLFormElement>('[data-text-counter-form]')
  const input = container.querySelector<HTMLTextAreaElement>('[data-text-counter-input]')
  const clearButton = container.querySelector<HTMLButtonElement>('[data-text-counter-clear]')
  const inputLabel = container.querySelector<HTMLElement>('[data-text-counter-input-label]')
  const resultsLabel = container.querySelector<HTMLElement>('[data-text-counter-results-label]')
  const results = container.querySelector<HTMLElement>('[data-text-counter-results]')

  if (!form || !input || !clearButton || !inputLabel || !resultsLabel || !results) {
    return null
  }

  const statValues = {} as TextCounterElements['statValues']
  const statLabels = {} as TextCounterElements['statLabels']
  let missing = false

  for (const key of TEXT_COUNTER_STAT_KEYS) {
    const valueElement = container.querySelector<HTMLElement>(
      `[data-text-counter-stat-value="${key}"]`,
    )
    const labelElement = container.querySelector<HTMLElement>(
      `[data-text-counter-stat-label="${key}"]`,
    )
    if (!valueElement || !labelElement) {
      missing = true
      break
    }
    statValues[key] = valueElement
    statLabels[key] = labelElement
  }

  if (missing) {
    return null
  }

  return { form, input, clearButton, inputLabel, resultsLabel, results, statValues, statLabels }
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

export const mountTextCounter = (container: HTMLElement, initialMessages: Messages): void => {
  const root = container.querySelector<HTMLElement>('[data-text-counter-root]') ?? container
  const elements = queryTextCounterElements(container)
  if (!elements) {
    return
  }

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

  textCounterLocale.register(root, syncLocale)

  elements.input.addEventListener('input', () => {
    state.inputValue = elements.input.value
    updateResults(elements, state)
  })

  elements.form.addEventListener('submit', (event) => {
    event.preventDefault()
    updateResults(elements, state)
  })

  elements.clearButton.addEventListener('click', () => {
    state.inputValue = ''
    elements.input.value = ''
    updateResults(elements, state)
  })

  syncUi()
}

export const updateTextCounterLocale = textCounterLocale.update
