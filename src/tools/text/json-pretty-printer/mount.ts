import type { Messages } from '../../../i18n/schema.ts'
import { downloadBlob, formatAcceptList, readFileAsText } from '../../foundations/files.ts'
import { createLocaleSyncRegistry } from '../../foundations/locale-sync.ts'
import { wireFilePicker } from '../../foundations/file-picker/mount.ts'
import type { JsonPrettyPrinterElements, JsonPrettyPrinterState } from './types.ts'
import {
  createInitialJsonPrettyPrinterState,
  formatJsonValue,
  parseJsonOrJsonLines,
  parseIndentValue,
} from './utils.ts'

const jsonPrettyPrinterLocale = createLocaleSyncRegistry<[Messages]>('[data-json-pretty-printer-root]')

const queryJsonPrettyPrinterElements = (container: HTMLElement): JsonPrettyPrinterElements | null => {
  const form = container.querySelector<HTMLFormElement>('[data-json-pretty-printer-form]')
  const uploadLabel = container.querySelector<HTMLElement>('[data-json-pretty-printer-upload-label]')
  const uploadHint = container.querySelector<HTMLElement>('[data-json-pretty-printer-upload-hint]')
  const input = container.querySelector<HTMLTextAreaElement>('[data-json-pretty-printer-input]')
  const indentSelect = container.querySelector<HTMLSelectElement>('[data-json-pretty-printer-indent]')
  const formatButton = container.querySelector<HTMLButtonElement>('[data-json-pretty-printer-format]')
  const clearButton = container.querySelector<HTMLButtonElement>('[data-json-pretty-printer-clear]')
  const downloadButton = container.querySelector<HTMLButtonElement>('[data-json-pretty-printer-download]')
  const inputLabel = container.querySelector<HTMLElement>('[data-json-pretty-printer-input-label]')
  const indentLabel = container.querySelector<HTMLElement>('[data-json-pretty-printer-indent-label]')
  const indentOptionTwo = container.querySelector<HTMLOptionElement>('[data-json-pretty-printer-indent-two]')
  const indentOptionFour = container.querySelector<HTMLOptionElement>('[data-json-pretty-printer-indent-four]')
  const status = container.querySelector<HTMLElement>('[data-json-pretty-printer-status]')
  const outputLabel = container.querySelector<HTMLElement>('[data-json-pretty-printer-output-label]')
  const outputContainer = container.querySelector<HTMLElement>('[data-json-pretty-printer-output]')

  if (
    !form ||
    !uploadLabel ||
    !uploadHint ||
    !input ||
    !indentSelect ||
    !formatButton ||
    !clearButton ||
    !downloadButton ||
    !inputLabel ||
    !indentLabel ||
    !indentOptionTwo ||
    !indentOptionFour ||
    !status ||
    !outputLabel ||
    !outputContainer
  ) {
    return null
  }

  return {
    form,
    uploadLabel,
    uploadHint,
    input,
    indentSelect,
    formatButton,
    clearButton,
    downloadButton,
    inputLabel,
    indentLabel,
    indentOptionTwo,
    indentOptionFour,
    status,
    outputLabel,
    outputContainer,
  }
}

const INPUT_ACCEPT = '.json,.txt'
const INPUT_ACCEPT_LABEL = formatAcceptList(INPUT_ACCEPT)

const syncLocalizedText = (
  elements: JsonPrettyPrinterElements,
  messages: Messages,
): void => {
  const jsonMessages = messages.jsonPrettyPrinter
  elements.uploadLabel.textContent = jsonMessages.uploadLabel
  elements.uploadHint.textContent = `${jsonMessages.uploadHint}: ${INPUT_ACCEPT_LABEL}`
  elements.inputLabel.textContent = jsonMessages.inputLabel
  elements.input.placeholder = jsonMessages.inputPlaceholder
  elements.indentLabel.textContent = jsonMessages.indentLabel
  elements.indentOptionTwo.textContent = jsonMessages.indentTwoLabel
  elements.indentOptionFour.textContent = jsonMessages.indentFourLabel
  elements.formatButton.textContent = jsonMessages.formatAction
  elements.clearButton.textContent = jsonMessages.clearAction
  elements.downloadButton.textContent = jsonMessages.downloadAction
  elements.outputLabel.textContent = jsonMessages.outputLabel
}

const formatPrimitive = (value: unknown): string => {
  if (value === null) {
    return 'null'
  }

  if (typeof value === 'string') {
    return JSON.stringify(value)
  }

  return String(value)
}

const createLine = (indentLevel: number, indentSize: number): HTMLDivElement => {
  const line = document.createElement('div')
  line.className = 'json-pretty-printer-line'
  line.style.paddingLeft = `${indentLevel * indentSize}ch`
  return line
}

const createToggleButton = (messages: Messages, collapsed: boolean): HTMLButtonElement => {
  const jsonMessages = messages.jsonPrettyPrinter
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'json-pretty-printer-toggle'
  button.textContent = collapsed ? '+' : '-'
  button.setAttribute('aria-label', collapsed ? jsonMessages.expandAction : jsonMessages.collapseAction)
  return button
}

const updateToggleLabel = (button: HTMLButtonElement, collapsed: boolean, messages: Messages): void => {
  const jsonMessages = messages.jsonPrettyPrinter
  button.textContent = collapsed ? '+' : '-'
  button.setAttribute('aria-label', collapsed ? jsonMessages.expandAction : jsonMessages.collapseAction)
}

const renderJsonValue = (
  value: unknown,
  indentLevel: number,
  indentSize: number,
  isLast: boolean,
  leadingText: string,
  messages: Messages,
): HTMLElement => {
  if (value === null || typeof value !== 'object') {
    const line = createLine(indentLevel, indentSize)
    line.textContent = `${leadingText}${formatPrimitive(value)}${isLast ? '' : ','}`
    return line
  }

  const isArray = Array.isArray(value)
  const openToken = isArray ? '[' : '{'
  const closeToken = isArray ? ']' : '}'

  const node = document.createElement('div')
  node.className = 'json-pretty-printer-node'

  const line = createLine(indentLevel, indentSize)
  if (leadingText) {
    line.append(document.createTextNode(leadingText))
  }
  line.append(document.createTextNode(openToken))

  const toggleButton = createToggleButton(messages, false)
  line.append(toggleButton)

  const inlineClose = document.createElement('span')
  inlineClose.className = 'json-pretty-printer-inline-close'
  inlineClose.textContent = ` ${closeToken}${isLast ? '' : ','}`
  line.append(inlineClose)

  const children = document.createElement('div')
  children.className = 'json-pretty-printer-children'

  if (isArray) {
    const entries = value as unknown[]
    entries.forEach((entry, index) => {
      const child = renderJsonValue(
        entry,
        indentLevel + 1,
        indentSize,
        index === entries.length - 1,
        '',
        messages,
      )
      children.append(child)
    })
  } else {
    const record = value as Record<string, unknown>
    const keys = Object.keys(record)
    keys.forEach((keyName, index) => {
      const child = renderJsonValue(
        record[keyName],
        indentLevel + 1,
        indentSize,
        index === keys.length - 1,
        `${JSON.stringify(keyName)}: `,
        messages,
      )
      children.append(child)
    })
  }

  const closeLine = createLine(indentLevel, indentSize)
  closeLine.className = 'json-pretty-printer-close-line'
  closeLine.textContent = `${closeToken}${isLast ? '' : ','}`

  node.append(line, children, closeLine)

  toggleButton.addEventListener('click', () => {
    const collapsed = node.classList.toggle('is-collapsed')
    updateToggleLabel(toggleButton, collapsed, messages)
  })

  return node
}

const updateStatus = (elements: JsonPrettyPrinterElements, messages: Messages, state: JsonPrettyPrinterState): void => {
  const jsonMessages = messages.jsonPrettyPrinter
  if (state.status === 'ready') {
    elements.status.textContent = jsonMessages.statusReady
  } else if (state.status === 'invalid') {
    elements.status.textContent = jsonMessages.statusInvalid
  } else {
    elements.status.textContent = jsonMessages.statusEmpty
  }
}

const resetOutput = (elements: JsonPrettyPrinterElements): void => {
  elements.outputContainer.replaceChildren()
}

const applyFormattedOutput = (
  elements: JsonPrettyPrinterElements,
  state: JsonPrettyPrinterState,
  messages: Messages,
): void => {
  elements.outputContainer.replaceChildren(
    renderJsonValue(state.parsedValue, 0, state.indentSize, true, '', messages),
  )
}

const formatJsonInput = (
  elements: JsonPrettyPrinterElements,
  state: JsonPrettyPrinterState,
  messages: Messages,
): void => {
  const trimmed = state.inputValue.trim()
  if (!trimmed) {
    state.status = 'empty'
    state.parsedValue = null
    state.formattedJson = ''
    resetOutput(elements)
    elements.downloadButton.disabled = true
    return
  }

  try {
    state.parsedValue = parseJsonOrJsonLines(state.inputValue)
    state.formattedJson = formatJsonValue(state.parsedValue, state.indentSize)
    state.status = 'ready'
    applyFormattedOutput(elements, state, messages)
    elements.downloadButton.disabled = false
  } catch {
    state.status = 'invalid'
    state.parsedValue = null
    state.formattedJson = ''
    resetOutput(elements)
    elements.downloadButton.disabled = true
  }
}

export const mountJsonPrettyPrinter = (container: HTMLElement, initialMessages: Messages): void => {
  const root = container.querySelector<HTMLElement>('[data-json-pretty-printer-root]') ?? container
  const elements = queryJsonPrettyPrinterElements(container)
  const filePicker = wireFilePicker(root, { onFiles: (files) => void loadFile(files[0]) })
  if (!elements || !filePicker) {
    return
  }

  let messages = initialMessages
  const state = createInitialJsonPrettyPrinterState()
  let validateDelayId: number | null = null

  const syncUi = (): void => {
    syncLocalizedText(elements, messages)
    elements.input.value = state.inputValue
    elements.indentSelect.value = String(state.indentSize)
    updateStatus(elements, messages, state)
    if (state.status === 'ready') {
      applyFormattedOutput(elements, state, messages)
      elements.downloadButton.disabled = false
    } else {
      resetOutput(elements)
      elements.downloadButton.disabled = true
    }
  }

  const syncLocale = (nextMessages: Messages): void => {
    messages = nextMessages
    syncUi()
  }

  jsonPrettyPrinterLocale.register(root, syncLocale)

  const updateFileName = (fileName: string | null): void => {
    state.selectedFileName = fileName
    filePicker.setName(fileName ?? messages.jsonPrettyPrinter.noFileSelected)
  }

  const loadFile = async (file: File): Promise<void> => {
    try {
      updateFileName(file.name)
      state.inputValue = await readFileAsText(file)
      elements.input.value = state.inputValue
      formatJsonInput(elements, state, messages)
      updateStatus(elements, messages, state)
    } catch {
      state.status = 'invalid'
      updateStatus(elements, messages, state)
    }
  }

  const scheduleValidation = (): void => {
    if (validateDelayId !== null) {
      window.clearTimeout(validateDelayId)
    }
    validateDelayId = window.setTimeout(() => {
      formatJsonInput(elements, state, messages)
      updateStatus(elements, messages, state)
    }, 50)
  }

  elements.input.addEventListener('input', () => {
    state.inputValue = elements.input.value
    scheduleValidation()
  })

  elements.indentSelect.addEventListener('change', () => {
    state.indentSize = parseIndentValue(elements.indentSelect.value)
    if (state.parsedValue !== null) {
      state.formattedJson = formatJsonValue(state.parsedValue, state.indentSize)
      applyFormattedOutput(elements, state, messages)
    }
  })

  elements.form.addEventListener('submit', (event) => {
    event.preventDefault()
    formatJsonInput(elements, state, messages)
    updateStatus(elements, messages, state)
  })

  elements.clearButton.addEventListener('click', () => {
    state.inputValue = ''
    state.parsedValue = null
    state.formattedJson = ''
    state.status = 'empty'
    state.selectedFileName = null
    elements.input.value = ''
    filePicker.input.value = ''
    filePicker.setName(messages.jsonPrettyPrinter.noFileSelected)
    updateStatus(elements, messages, state)
    resetOutput(elements)
    elements.downloadButton.disabled = true
  })

  elements.downloadButton.addEventListener('click', () => {
    if (!state.formattedJson) {
      return
    }

    const blob = new Blob([state.formattedJson], { type: 'application/json' })
    downloadBlob(blob, 'pretty.json')
  })

  syncUi()
}

export const updateJsonPrettyPrinterLocale = jsonPrettyPrinterLocale.update
