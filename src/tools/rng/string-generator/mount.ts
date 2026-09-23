import type { Messages } from '../../../i18n/schema.ts'
import type { StringGeneratorElements, StringGeneratorState } from './types.ts'
import {
  createUniqueEntryPool,
  formatStringGeneratorStatus,
  parseStringGeneratorEntries,
  pickWeightedEntryIndex,
} from './utils.ts'
import { queryRequired } from '../../foundations/dom.ts'
import type { MountTool } from '../../types.ts'

const queryStringGeneratorElements = (container: HTMLElement): StringGeneratorElements | null =>
  queryRequired<StringGeneratorElements>(container, {
    form: '[data-rng-string-generator-form]',
    entriesTextarea: '[data-rng-string-generator-entries]',
    uniqueModeInput: '[data-rng-string-generator-unique-mode]',
    generateButton: '[data-rng-string-generator-generate]',
    resetButton: '[data-rng-string-generator-reset]',
    resultOutput: '[data-rng-string-generator-result]',
    statusMessage: '[data-rng-string-generator-status]',
    listLegend: '[data-rng-string-generator-list-legend]',
    listHint: '[data-rng-string-generator-list-hint]',
    optionsLegend: '[data-rng-string-generator-options-legend]',
    uniqueModeLabel: '[data-rng-string-generator-unique-label]',
    uniqueModeHint: '[data-rng-string-generator-unique-hint]',
  })

const syncLocalizedText = (elements: StringGeneratorElements, messages: Messages): void => {
  const stringMessages = messages.rngStringGenerator
  elements.listLegend.textContent = stringMessages.listLegend
  elements.entriesTextarea.setAttribute('aria-label', stringMessages.listLegend)
  elements.listHint.textContent = stringMessages.listHint
  elements.optionsLegend.textContent = stringMessages.optionsLegend
  elements.uniqueModeLabel.textContent = stringMessages.uniqueModeLabel
  elements.uniqueModeHint.textContent = stringMessages.uniqueModeHint
  elements.generateButton.textContent = stringMessages.generateAction
  elements.resetButton.textContent = stringMessages.resetAction
}

const syncStatus = (elements: StringGeneratorElements, messages: Messages, state: StringGeneratorState): void => {
  const entries = parseStringGeneratorEntries(state.entriesText)
  elements.statusMessage.textContent = formatStringGeneratorStatus(
    messages,
    entries.length,
    state.uniqueMode,
    state.uniqueMode ? state.availableEntryIndices.length : entries.length,
  )
}

const generateString = (elements: StringGeneratorElements, state: StringGeneratorState, messages: Messages): void => {
  const entries = parseStringGeneratorEntries(state.entriesText)

  if (entries.length === 0) {
    state.resultText = '—'
    elements.resultOutput.textContent = state.resultText
    syncStatus(elements, messages, state)
    return
  }

  if (state.uniqueMode) {
    if (state.availableEntryIndices.length === 0) {
      syncStatus(elements, messages, state)
      return
    }

    const pickedIndex = pickWeightedEntryIndex(entries, state.availableEntryIndices)
    if (pickedIndex === null) {
      syncStatus(elements, messages, state)
      return
    }

    const selectedEntry = entries[pickedIndex]
    state.resultText = selectedEntry.value
    state.availableEntryIndices = state.availableEntryIndices.filter((index) => index !== pickedIndex)
  } else {
    const pickedIndex = pickWeightedEntryIndex(entries, entries.map((_, index) => index))
    if (pickedIndex === null) {
      syncStatus(elements, messages, state)
      return
    }

    state.resultText = entries[pickedIndex].value
  }

  elements.resultOutput.textContent = state.resultText
  syncStatus(elements, messages, state)
}

export const mountStringGenerator: MountTool = (container, initialMessages) => {
  const elements = queryStringGeneratorElements(container)
  if (!elements) {
    return {}
  }

  let messages = initialMessages
  const state: StringGeneratorState = {
    entriesText: elements.entriesTextarea.value,
    uniqueMode: elements.uniqueModeInput.checked,
    availableEntryIndices: [],
    resultText: elements.resultOutput.textContent || '—',
  }

  const syncUi = (): void => {
    syncLocalizedText(elements, messages)
    elements.entriesTextarea.value = state.entriesText
    elements.uniqueModeInput.checked = state.uniqueMode
    elements.resultOutput.textContent = state.resultText
    syncStatus(elements, messages, state)
  }

  const syncLocale = (nextMessages: Messages): void => {
    messages = nextMessages
    syncUi()
  }

  elements.entriesTextarea.addEventListener('input', () => {
    state.entriesText = elements.entriesTextarea.value
    if (state.uniqueMode) {
      const entries = parseStringGeneratorEntries(state.entriesText)
      state.availableEntryIndices = createUniqueEntryPool(entries)
    }
    syncStatus(elements, messages, state)
  })

  elements.uniqueModeInput.addEventListener('change', () => {
    state.uniqueMode = elements.uniqueModeInput.checked
    const entries = parseStringGeneratorEntries(state.entriesText)
    state.availableEntryIndices = state.uniqueMode ? createUniqueEntryPool(entries) : []
    syncStatus(elements, messages, state)
  })

  elements.form.addEventListener('submit', (event) => {
    event.preventDefault()
    generateString(elements, state, messages)
  })

  elements.resetButton.addEventListener('click', () => {
    const entries = parseStringGeneratorEntries(state.entriesText)
    state.availableEntryIndices = createUniqueEntryPool(entries)
    syncStatus(elements, messages, state)
  })

  syncUi()

  const entries = parseStringGeneratorEntries(state.entriesText)
  state.availableEntryIndices = state.uniqueMode ? createUniqueEntryPool(entries) : []
  syncStatus(elements, messages, state)

  return { updateLocale: syncLocale }
}
