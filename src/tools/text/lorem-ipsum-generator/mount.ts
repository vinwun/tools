import type { Messages } from '../../../i18n/schema.ts'
import type { LoremIpsumGeneratorElements, LoremIpsumGeneratorState } from './types.ts'
import {
  createInitialLoremIpsumGeneratorState,
  generateLoremText,
} from './utils.ts'
import { copyText } from '../../foundations/clipboard.ts'
import { createLocaleSyncRegistry } from '../../foundations/locale-sync.ts'

const loremIpsumGeneratorLocale = createLocaleSyncRegistry<[Messages]>('[data-lorem-ipsum-generator-root]')

const queryLoremIpsumGeneratorElements = (
  container: HTMLElement,
): LoremIpsumGeneratorElements | null => {
  const form = container.querySelector<HTMLFormElement>('[data-lorem-ipsum-generator-form]')
  const amountInput = container.querySelector<HTMLInputElement>(
    '[data-lorem-ipsum-generator-amount-input]',
  )
  const unitSelect = container.querySelector<HTMLSelectElement>(
    '[data-lorem-ipsum-generator-unit-select]',
  )
  const classicCheckbox = container.querySelector<HTMLInputElement>(
    '[data-lorem-ipsum-generator-classic-checkbox]',
  )
  const generateButton = container.querySelector<HTMLButtonElement>(
    '[data-lorem-ipsum-generator-generate]',
  )
  const copyButton = container.querySelector<HTMLButtonElement>('[data-lorem-ipsum-generator-copy]')
  const clearButton = container.querySelector<HTMLButtonElement>(
    '[data-lorem-ipsum-generator-clear]',
  )
  const output = container.querySelector<HTMLTextAreaElement>('[data-lorem-ipsum-generator-output]')
  const status = container.querySelector<HTMLElement>('[data-lorem-ipsum-generator-status]')
  const settingsLegend = container.querySelector<HTMLElement>(
    '[data-lorem-ipsum-generator-settings-legend]',
  )
  const amountLabel = container.querySelector<HTMLElement>(
    '[data-lorem-ipsum-generator-amount-label]',
  )
  const unitLabel = container.querySelector<HTMLElement>('[data-lorem-ipsum-generator-unit-label]')
  const classicLabel = container.querySelector<HTMLElement>(
    '[data-lorem-ipsum-generator-classic-label]',
  )
  const outputLabel = container.querySelector<HTMLElement>(
    '[data-lorem-ipsum-generator-output-label]',
  )
  const unitOptionCharacters = container.querySelector<HTMLOptionElement>(
    '[data-lorem-ipsum-generator-unit-option-characters]',
  )
  const unitOptionWords = container.querySelector<HTMLOptionElement>(
    '[data-lorem-ipsum-generator-unit-option-words]',
  )
  const unitOptionSentences = container.querySelector<HTMLOptionElement>(
    '[data-lorem-ipsum-generator-unit-option-sentences]',
  )
  const unitOptionParagraphs = container.querySelector<HTMLOptionElement>(
    '[data-lorem-ipsum-generator-unit-option-paragraphs]',
  )

  if (
    !form ||
    !amountInput ||
    !unitSelect ||
    !classicCheckbox ||
    !generateButton ||
    !copyButton ||
    !clearButton ||
    !output ||
    !status ||
    !settingsLegend ||
    !amountLabel ||
    !unitLabel ||
    !classicLabel ||
    !outputLabel ||
    !unitOptionCharacters ||
    !unitOptionWords ||
    !unitOptionSentences ||
    !unitOptionParagraphs
  ) {
    return null
  }

  return {
    form,
    amountInput,
    unitSelect,
    classicCheckbox,
    generateButton,
    copyButton,
    clearButton,
    output,
    status,
    settingsLegend,
    amountLabel,
    unitLabel,
    classicLabel,
    outputLabel,
    unitOptionCharacters,
    unitOptionWords,
    unitOptionSentences,
    unitOptionParagraphs,
  }
}

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

export const mountLoremIpsumGenerator = (
  container: HTMLElement,
  initialMessages: Messages,
): void => {
  const root = container.querySelector<HTMLElement>('[data-lorem-ipsum-generator-root]') ?? container
  const elements = queryLoremIpsumGeneratorElements(container)
  if (!elements) {
    return
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

  loremIpsumGeneratorLocale.register(root, syncLocale)

  const generate = (): void => {
    state.amount = parseAmount(elements.amountInput.value)
    state.unit = elements.unitSelect.value as LoremIpsumGeneratorState['unit']
    state.startWithClassic = elements.classicCheckbox.checked
    state.outputValue = generateLoremText(state.amount, state.unit, state.startWithClassic)
    elements.output.value = state.outputValue
    elements.status.textContent = ''
    elements.copyButton.disabled = state.outputValue.length === 0
  }

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
}

export const updateLoremIpsumGeneratorLocale = loremIpsumGeneratorLocale.update
