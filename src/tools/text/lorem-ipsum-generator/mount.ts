import type { Messages } from '../../../i18n/schema.ts'
import type { LoremIpsumGeneratorElements, LoremIpsumGeneratorState } from './types.ts'
import {
  createInitialLoremIpsumGeneratorState,
  generateLoremText,
} from './utils.ts'
import { copyText } from '../../foundations/clipboard.ts'
import { queryRequired } from '../../foundations/dom.ts'
import type { MountTool } from '../../types.ts'

const parseAmount = (value: string): number => {
  const parsed = Math.floor(Number(value))
  if (!Number.isFinite(parsed)) {
    return 1
  }
  return Math.min(10000, Math.max(1, parsed))
}

const syncLocalizedText = (
  elements: LoremIpsumGeneratorElements,
  messages: Messages,
): void => {
  const loremMessages = messages.loremIpsumGenerator
  elements.settingsLegend.textContent = loremMessages.settingsLegend
  elements.amountLabel.textContent = loremMessages.amountLabel
  elements.unitLabel.textContent = loremMessages.unitLabel
  elements.unitOptionCharacters.textContent = loremMessages.unitCharacters
  elements.unitOptionWords.textContent = loremMessages.unitWords
  elements.unitOptionSentences.textContent = loremMessages.unitSentences
  elements.unitOptionParagraphs.textContent = loremMessages.unitParagraphs
  elements.classicLabel.textContent = loremMessages.classicLabel
  elements.generateButton.textContent = loremMessages.generateAction
  elements.copyButton.textContent = loremMessages.copyAction
  elements.clearButton.textContent = loremMessages.clearAction
  elements.outputLabel.textContent = loremMessages.outputLabel
}

export const mountLoremIpsumGenerator: MountTool = (container, initialMessages) => {
  const elements = queryRequired<LoremIpsumGeneratorElements>(container, {
    form: '[data-lorem-ipsum-generator-form]',
    amountInput: '[data-lorem-ipsum-generator-amount-input]',
    unitSelect: '[data-lorem-ipsum-generator-unit-select]',
    classicCheckbox: '[data-lorem-ipsum-generator-classic-checkbox]',
    generateButton: '[data-lorem-ipsum-generator-generate]',
    copyButton: '[data-lorem-ipsum-generator-copy]',
    clearButton: '[data-lorem-ipsum-generator-clear]',
    output: '[data-lorem-ipsum-generator-output]',
    status: '[data-lorem-ipsum-generator-status]',
    settingsLegend: '[data-lorem-ipsum-generator-settings-legend]',
    amountLabel: '[data-lorem-ipsum-generator-amount-label]',
    unitLabel: '[data-lorem-ipsum-generator-unit-label]',
    classicLabel: '[data-lorem-ipsum-generator-classic-label]',
    outputLabel: '[data-lorem-ipsum-generator-output-label]',
    unitOptionCharacters: '[data-lorem-ipsum-generator-unit-option-characters]',
    unitOptionWords: '[data-lorem-ipsum-generator-unit-option-words]',
    unitOptionSentences: '[data-lorem-ipsum-generator-unit-option-sentences]',
    unitOptionParagraphs: '[data-lorem-ipsum-generator-unit-option-paragraphs]',
  })
  if (!elements) {
    return {}
  }

  let messages = initialMessages
  const state = createInitialLoremIpsumGeneratorState()

  const syncUi = (): void => {
    syncLocalizedText(elements, messages)
    elements.amountInput.value = String(state.amount)
    elements.unitSelect.value = state.unit
    elements.classicCheckbox.checked = state.startWithClassic
    elements.output.value = state.outputValue
    elements.status.textContent = ''
    elements.copyButton.disabled = state.outputValue.length === 0
  }

  const syncLocale = (nextMessages: Messages): void => {
    messages = nextMessages
    syncUi()
  }

  const generate = (): void => {
    state.amount = parseAmount(elements.amountInput.value)
    state.unit = elements.unitSelect.value as LoremIpsumGeneratorState['unit']
    state.startWithClassic = elements.classicCheckbox.checked
    state.outputValue = generateLoremText(state.amount, state.unit, state.startWithClassic)
    elements.output.value = state.outputValue
    elements.status.textContent = ''
    elements.copyButton.disabled = state.outputValue.length === 0
  }

  // Shows the amount that is actually used instead of leaving "0", "-2" or an empty field.
  elements.amountInput.addEventListener('blur', () => {
    elements.amountInput.value = String(parseAmount(elements.amountInput.value))
  })

  elements.form.addEventListener('submit', (event) => {
    event.preventDefault()
    generate()
  })

  elements.copyButton.addEventListener('click', async () => {
    const text = state.outputValue
    if (!text) {
      return
    }

    const copied = await copyText(text)
    elements.status.textContent = copied
      ? messages.loremIpsumGenerator.copiedMessage
      : messages.loremIpsumGenerator.copyFailedMessage
  })

  elements.clearButton.addEventListener('click', () => {
    state.outputValue = ''
    elements.output.value = ''
    elements.status.textContent = ''
    elements.copyButton.disabled = true
  })

  syncUi()
  generate()
  return { updateLocale: syncLocale }
}
