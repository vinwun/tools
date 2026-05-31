import type { Messages } from '../../../i18n/schema.ts'
import type { MarkdownDisplayerElements, MarkdownDisplayerState } from './types.ts'
import { createInitialMarkdownDisplayerState, renderMarkdownToHtml, wrapHtmlDocument } from './utils.ts'

const markdownDisplayerLocaleSyncers = new WeakMap<HTMLElement, (messages: Messages) => void>()

const queryMarkdownDisplayerElements = (container: HTMLElement): MarkdownDisplayerElements | null => {
  const form = container.querySelector<HTMLFormElement>('[data-markdown-displayer-form]')
  const uploadInput = container.querySelector<HTMLInputElement>('[data-markdown-displayer-file-input]')
  const uploadDropZone = container.querySelector<HTMLElement>('[data-markdown-displayer-dropzone]')
  const uploadLabel = container.querySelector<HTMLElement>('[data-markdown-displayer-upload-label]')
  const uploadFileButton = container.querySelector<HTMLButtonElement>('[data-markdown-displayer-file-button]')
  const uploadFileName = container.querySelector<HTMLElement>('[data-markdown-displayer-file-name]')
  const uploadHint = container.querySelector<HTMLElement>('[data-markdown-displayer-upload-hint]')
  const input = container.querySelector<HTMLTextAreaElement>('[data-markdown-displayer-input]')
  const renderButton = container.querySelector<HTMLButtonElement>('[data-markdown-displayer-render]')
  const clearButton = container.querySelector<HTMLButtonElement>('[data-markdown-displayer-clear]')
  const downloadButton = container.querySelector<HTMLButtonElement>('[data-markdown-displayer-download]')
  const inputLabel = container.querySelector<HTMLElement>('[data-markdown-displayer-input-label]')
  const outputLabel = container.querySelector<HTMLElement>('[data-markdown-displayer-output-label]')
  const status = container.querySelector<HTMLElement>('[data-markdown-displayer-status]')
  const outputContainer = container.querySelector<HTMLElement>('[data-markdown-displayer-output]')

  if (
    !form ||
    !uploadInput ||
    !uploadDropZone ||
    !uploadLabel ||
    !uploadFileButton ||
    !uploadFileName ||
    !uploadHint ||
    !input ||
    !renderButton ||
    !clearButton ||
    !downloadButton ||
    !inputLabel ||
    !outputLabel ||
    !status ||
    !outputContainer
  ) {
    return null
  }

  return {
    form,
    uploadInput,
    uploadDropZone,
    uploadLabel,
    uploadFileButton,
    uploadFileName,
    uploadHint,
    input,
    renderButton,
    clearButton,
    downloadButton,
    inputLabel,
    outputLabel,
    status,
    outputContainer,
  }
}

const INPUT_ACCEPT = '.md,.txt'
const INPUT_ACCEPT_LABEL = INPUT_ACCEPT.replaceAll(',', ' / ')

const syncLocalizedText = (
  elements: MarkdownDisplayerElements,
  messages: Messages,
  state: MarkdownDisplayerState,
): void => {
  const markdownMessages = messages.markdownDisplayer
  elements.uploadLabel.textContent = markdownMessages.uploadLabel
  elements.uploadHint.textContent = `${markdownMessages.uploadHint}: ${INPUT_ACCEPT_LABEL}`
  elements.uploadFileButton.textContent = markdownMessages.uploadAction
  elements.uploadFileName.textContent = state.selectedFileName ?? markdownMessages.noFileSelected
  elements.inputLabel.textContent = markdownMessages.inputLabel
  elements.input.placeholder = markdownMessages.inputPlaceholder
  elements.renderButton.textContent = markdownMessages.renderAction
  elements.clearButton.textContent = markdownMessages.clearAction
  elements.downloadButton.textContent = markdownMessages.downloadAction
  elements.outputLabel.textContent = markdownMessages.outputLabel
}

const updateStatus = (
  elements: MarkdownDisplayerElements,
  messages: Messages,
  state: MarkdownDisplayerState,
): void => {
  const markdownMessages = messages.markdownDisplayer
  elements.status.textContent = state.status === 'ready' ? markdownMessages.statusReady : markdownMessages.statusEmpty
}

const resetOutput = (elements: MarkdownDisplayerElements): void => {
  elements.outputContainer.replaceChildren()
}

const syncCodeBlockHeights = (elements: MarkdownDisplayerElements): void => {
  const codeBlocks = elements.outputContainer.querySelectorAll<HTMLPreElement>('pre')
  codeBlocks.forEach((block) => {
    const styles = window.getComputedStyle(block)
    const borderTop = Number.parseFloat(styles.borderTopWidth) || 0
    const borderBottom = Number.parseFloat(styles.borderBottomWidth) || 0
    block.style.height = 'auto'
    block.style.overflowY = 'hidden'
    const height = block.scrollHeight + borderTop + borderBottom
    block.style.height = `${height}px`
  })
}

const applyRenderedOutput = (elements: MarkdownDisplayerElements, state: MarkdownDisplayerState): void => {
  elements.outputContainer.innerHTML = state.renderedHtml
  syncCodeBlockHeights(elements)
}

const renderMarkdownInput = (
  elements: MarkdownDisplayerElements,
  state: MarkdownDisplayerState,
): void => {
  const trimmed = state.inputValue.trim()
  if (!trimmed) {
    state.status = 'empty'
    state.renderedHtml = ''
    state.renderedDocument = ''
    resetOutput(elements)
    elements.downloadButton.disabled = true
    return
  }

  state.renderedHtml = renderMarkdownToHtml(state.inputValue)
  state.renderedDocument = wrapHtmlDocument(state.renderedHtml)
  state.status = 'ready'
  applyRenderedOutput(elements, state)
  elements.downloadButton.disabled = false
}

const readMarkdownFile = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('File read failed'))
    reader.readAsText(file)
  })

export const mountMarkdownDisplayer = (container: HTMLElement, initialMessages: Messages): void => {
  const root = container.querySelector<HTMLElement>('[data-markdown-displayer-root]') ?? container
  const elements = queryMarkdownDisplayerElements(container)
  if (!elements) {
    return
  }

  let messages = initialMessages
  const state = createInitialMarkdownDisplayerState()
  let renderDelayId: number | null = null

  const syncUi = (): void => {
    syncLocalizedText(elements, messages, state)
    elements.input.value = state.inputValue
    updateStatus(elements, messages, state)
    if (state.status === 'ready') {
      applyRenderedOutput(elements, state)
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

  markdownDisplayerLocaleSyncers.set(root, syncLocale)

  const updateFileName = (fileName: string | null): void => {
    state.selectedFileName = fileName
    elements.uploadFileName.textContent = fileName ?? messages.markdownDisplayer.noFileSelected
  }

  const loadFile = async (file: File): Promise<void> => {
    try {
      updateFileName(file.name)
      state.inputValue = await readMarkdownFile(file)
      elements.input.value = state.inputValue
      renderMarkdownInput(elements, state)
      updateStatus(elements, messages, state)
    } catch {
      state.status = 'empty'
      updateStatus(elements, messages, state)
    }
  }

  const scheduleRender = (): void => {
    if (renderDelayId !== null) {
      window.clearTimeout(renderDelayId)
    }
    renderDelayId = window.setTimeout(() => {
      renderMarkdownInput(elements, state)
      updateStatus(elements, messages, state)
    }, 50)
  }

  elements.input.addEventListener('input', () => {
    state.inputValue = elements.input.value
    scheduleRender()
  })

  elements.uploadInput.addEventListener('change', async () => {
    const file = elements.uploadInput.files?.[0]
    if (!file) {
      return
    }

    await loadFile(file)
  })

  elements.uploadFileButton.addEventListener('click', () => {
    elements.uploadInput.click()
  })

  const handleDrop = async (file: File): Promise<void> => {
    await loadFile(file)
  }

  elements.uploadDropZone.addEventListener('dragover', (event) => {
    event.preventDefault()
    elements.uploadDropZone.classList.add('is-dragover')
  })

  elements.uploadDropZone.addEventListener('dragleave', () => {
    elements.uploadDropZone.classList.remove('is-dragover')
  })

  elements.uploadDropZone.addEventListener('drop', async (event) => {
    event.preventDefault()
    elements.uploadDropZone.classList.remove('is-dragover')
    const file = event.dataTransfer?.files?.[0]
    if (!file) {
      return
    }
    await handleDrop(file)
  })

  elements.form.addEventListener('submit', (event) => {
    event.preventDefault()
    renderMarkdownInput(elements, state)
    updateStatus(elements, messages, state)
  })

  elements.clearButton.addEventListener('click', () => {
    state.inputValue = ''
    state.renderedHtml = ''
    state.renderedDocument = ''
    state.status = 'empty'
    state.selectedFileName = null
    elements.input.value = ''
    elements.uploadInput.value = ''
    elements.uploadFileName.textContent = messages.markdownDisplayer.noFileSelected
    updateStatus(elements, messages, state)
    resetOutput(elements)
    elements.downloadButton.disabled = true
  })

  elements.downloadButton.addEventListener('click', () => {
    if (!state.renderedDocument) {
      return
    }

    const blob = new Blob([state.renderedDocument], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'markdown.html'
    anchor.click()
    URL.revokeObjectURL(url)
  })

  syncUi()
}

export const updateMarkdownDisplayerLocale = (container: HTMLElement, messages: Messages): void => {
  const root = container.querySelector<HTMLElement>('[data-markdown-displayer-root]') ?? container
  markdownDisplayerLocaleSyncers.get(root)?.(messages)
}
