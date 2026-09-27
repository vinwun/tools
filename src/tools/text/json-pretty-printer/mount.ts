import type { Messages } from '../../../i18n/schema.ts'
import { downloadBlob, formatAcceptList, readFileAsText, stripExtension } from '../../foundations/files.ts'
import { formatMessage, queryRequired } from '../../foundations/dom.ts'
import { wireFilePicker } from '../../foundations/file-picker/mount.ts'
import type { JsonPrettyPrinterElements, JsonPrettyPrinterState } from './types.ts'
import {
  createInitialJsonPrettyPrinterState,
  formatJsonValue,
  JSON_INPUT_ACCEPT,
  parseJsonOrJsonLines,
  parseIndentValue,
} from './utils.ts'
import type { MountTool } from '../../types.ts'


const syncLocalizedText = (
  elements: JsonPrettyPrinterElements,
  messages: Messages,
): void => {
  const jsonMessages = messages.jsonPrettyPrinter
  elements.uploadLabel.textContent = jsonMessages.uploadLabel
  elements.uploadHint.textContent = `${jsonMessages.uploadHint}: ${formatAcceptList(JSON_INPUT_ACCEPT)}`
  elements.inputLabel.textContent = jsonMessages.inputLabel
  elements.input.placeholder = jsonMessages.inputPlaceholder
  elements.largeFileHint.textContent = jsonMessages.largeFileHint
  elements.indentLabel.textContent = jsonMessages.indentLabel
  elements.indentOptionTwo.textContent = jsonMessages.indentTwoLabel
  elements.indentOptionFour.textContent = jsonMessages.indentFourLabel
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

// The indent width lives in one CSS variable on the output, so changing it re-renders nothing.
const createLine = (indentLevel: number): HTMLDivElement => {
  const line = document.createElement('div')
  line.className = 'json-pretty-printer-line'
  line.style.setProperty('--json-indent-level', String(indentLevel))
  return line
}

// Every rendered line is several elements, so huge lists would freeze or crash the tab; the
// preview stops after this many entries per list, the download still contains everything.
const MAX_RENDERED_ENTRIES = 100
const LARGE_INPUT_LENGTH = 1_000_000

const createTruncationLine = (indentLevel: number, hiddenCount: number, messages: Messages): HTMLDivElement => {
  const line = createLine(indentLevel)
  line.classList.add('json-pretty-printer-truncated')
  line.dataset.jsonTruncatedCount = String(hiddenCount)
  line.textContent = formatMessage(messages.jsonPrettyPrinter.truncatedEntries, { count: hiddenCount })
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
  isLast: boolean,
  leadingText: string,
  messages: Messages,
): HTMLElement => {
  if (value === null || typeof value !== 'object') {
    const line = createLine(indentLevel)
    line.textContent = `${leadingText}${formatPrimitive(value)}${isLast ? '' : ','}`
    return line
  }

  const isArray = Array.isArray(value)
  const openToken = isArray ? '[' : '{'
  const closeToken = isArray ? ']' : '}'

  const node = document.createElement('div')
  node.className = 'json-pretty-printer-node'

  const line = createLine(indentLevel)
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
    entries.slice(0, MAX_RENDERED_ENTRIES).forEach((entry, index) => {
      const child = renderJsonValue(
        entry,
        indentLevel + 1,
        index === entries.length - 1,
        '',
        messages,
      )
      children.append(child)
    })
  } else {
    const record = value as Record<string, unknown>
    const keys = Object.keys(record)
    keys.slice(0, MAX_RENDERED_ENTRIES).forEach((keyName, index) => {
      const child = renderJsonValue(
        record[keyName],
        indentLevel + 1,
        index === keys.length - 1,
        `${JSON.stringify(keyName)}: `,
        messages,
      )
      children.append(child)
    })
  }

  const entryCount = isArray ? (value as unknown[]).length : Object.keys(value).length
  if (entryCount > MAX_RENDERED_ENTRIES) {
    children.append(createTruncationLine(indentLevel + 1, entryCount - MAX_RENDERED_ENTRIES, messages))
  }

  const closeLine = createLine(indentLevel)
  closeLine.className = 'json-pretty-printer-close-line'
  closeLine.textContent = `${closeToken}${isLast ? '' : ','}`

  node.append(line, children, closeLine)

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
    renderJsonValue(state.parsedValue, 0, true, '', messages),
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

export const mountJsonPrettyPrinter: MountTool = (container, initialMessages) => {
  const elements = queryRequired<JsonPrettyPrinterElements>(container, {
    uploadLabel: '[data-json-pretty-printer-upload-label]',
    uploadHint: '[data-json-pretty-printer-upload-hint]',
    input: '[data-json-pretty-printer-input]',
    largeFileHint: '[data-json-pretty-printer-large-file-hint]',
    indentSelect: '[data-json-pretty-printer-indent]',
    clearButton: '[data-json-pretty-printer-clear]',
    downloadButton: '[data-json-pretty-printer-download]',
    inputLabel: '[data-json-pretty-printer-input-label]',
    indentLabel: '[data-json-pretty-printer-indent-label]',
    indentOptionTwo: '[data-json-pretty-printer-indent-two]',
    indentOptionFour: '[data-json-pretty-printer-indent-four]',
    status: '[data-json-pretty-printer-status]',
    outputLabel: '[data-json-pretty-printer-output-label]',
    outputContainer: '[data-json-pretty-printer-output]',
  })
  const filePicker = wireFilePicker(container, { onFiles: (files) => void loadFile(files[0]) })
  if (!elements || !filePicker) {
    return {}
  }

  let messages = initialMessages
  const state = createInitialJsonPrettyPrinterState()
  let validateDelayId: number | null = null

  // Relabels in place: re-rendering the output would lose which sections are collapsed.
  const syncLocale = (nextMessages: Messages): void => {
    messages = nextMessages
    syncLocalizedText(elements, messages)
    updateStatus(elements, messages, state)
    filePicker.browseButton.textContent = messages.jsonPrettyPrinter.uploadAction
    filePicker.setName(state.selectedFileName ?? messages.jsonPrettyPrinter.noFileSelected)
    elements.outputContainer.querySelectorAll<HTMLElement>('[data-json-truncated-count]').forEach((line) => {
      line.textContent = formatMessage(messages.jsonPrettyPrinter.truncatedEntries, { count: Number(line.dataset.jsonTruncatedCount) })
    })
    elements.outputContainer.querySelectorAll<HTMLButtonElement>('.json-pretty-printer-toggle').forEach((button) => {
      updateToggleLabel(button, button.closest('.json-pretty-printer-node')?.classList.contains('is-collapsed') ?? false, messages)
    })
  }

  const updateFileName = (fileName: string | null): void => {
    state.selectedFileName = fileName
    filePicker.setName(fileName ?? messages.jsonPrettyPrinter.noFileSelected)
  }

  // A textarea holding many megabytes makes the whole tab sluggish, so large files skip it.
  const showInputField = (visible: boolean): void => {
    elements.input.hidden = !visible
    elements.largeFileHint.hidden = visible
  }

  const clear = (): void => {
    showInputField(true)
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
  }

  const loadFile = async (file: File): Promise<void> => {
    try {
      updateFileName(file.name)
      state.inputValue = await readFileAsText(file)
      const isLarge = state.inputValue.length > LARGE_INPUT_LENGTH
      elements.input.value = isLarge ? '' : state.inputValue
      showInputField(!isLarge)
      formatJsonInput(elements, state, messages)
      updateStatus(elements, messages, state)
    } catch {
      // Keeping the previous output would pair it with the new file name.
      clear()
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
    elements.outputContainer.style.setProperty('--json-indent-size', `${state.indentSize}ch`)
    if (state.parsedValue !== null) {
      state.formattedJson = formatJsonValue(state.parsedValue, state.indentSize)
    }
  })

  elements.clearButton.addEventListener('click', clear)

  elements.outputContainer.addEventListener('click', (event) => {
    const toggleButton = (event.target as Element).closest<HTMLButtonElement>('.json-pretty-printer-toggle')
    const node = toggleButton?.closest('.json-pretty-printer-node')
    if (toggleButton && node) {
      updateToggleLabel(toggleButton, node.classList.toggle('is-collapsed'), messages)
    }
  })

  elements.downloadButton.addEventListener('click', () => {
    if (!state.formattedJson) {
      return
    }

    const blob = new Blob([state.formattedJson], { type: 'application/json' })
    downloadBlob(blob, state.selectedFileName ? `${stripExtension(state.selectedFileName)}-formatted.json` : 'pretty.json')
  })

  return {
    updateLocale: syncLocale,
    destroy: () => {
      if (validateDelayId !== null) {
        window.clearTimeout(validateDelayId)
      }
    },
  }
}
