import type { Messages } from '../../../i18n/schema.ts'
import { downloadBlob, formatAcceptList, readFileAsText } from '../../foundations/files.ts'
import { createLocaleSyncRegistry } from '../../foundations/locale-sync.ts'
import { wireFilePicker } from '../../foundations/file-picker/mount.ts'
import type { MarkdownViewerElements, MarkdownViewerState } from './types.ts'
import { createInitialMarkdownViewerState, renderMarkdownToHtml, wrapHtmlDocument } from './utils.ts'

const markdownViewerLocale = createLocaleSyncRegistry<[Messages]>('[data-markdown-viewer-root]')

const queryMarkdownViewerElements = (container: HTMLElement): MarkdownViewerElements | null => {
  const form = container.querySelector<HTMLFormElement>('[data-markdown-viewer-form]')
  const uploadLabel = container.querySelector<HTMLElement>('[data-markdown-viewer-upload-label]')
  const uploadHint = container.querySelector<HTMLElement>('[data-markdown-viewer-upload-hint]')
  const input = container.querySelector<HTMLTextAreaElement>('[data-markdown-viewer-input]')
  const renderButton = container.querySelector<HTMLButtonElement>('[data-markdown-viewer-render]')
  const clearButton = container.querySelector<HTMLButtonElement>('[data-markdown-viewer-clear]')
  const downloadButton = container.querySelector<HTMLButtonElement>('[data-markdown-viewer-download]')
  const inputLabel = container.querySelector<HTMLElement>('[data-markdown-viewer-input-label]')
  const outputLabel = container.querySelector<HTMLElement>('[data-markdown-viewer-output-label]')
  const status = container.querySelector<HTMLElement>('[data-markdown-viewer-status]')
  const outputContainer = container.querySelector<HTMLElement>('[data-markdown-viewer-output]')

  if (
    !form ||
    !uploadLabel ||
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
    uploadLabel,
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
const INPUT_ACCEPT_LABEL = formatAcceptList(INPUT_ACCEPT)

const syncLocalizedText = (
  elements: MarkdownViewerElements,
  messages: Messages,
): void => {
  const markdownMessages = messages.markdownViewer
  elements.uploadLabel.textContent = markdownMessages.uploadLabel
  elements.uploadHint.textContent = `${markdownMessages.uploadHint}: ${INPUT_ACCEPT_LABEL}`
  elements.inputLabel.textContent = markdownMessages.inputLabel
  elements.input.placeholder = markdownMessages.inputPlaceholder
  elements.renderButton.textContent = markdownMessages.renderAction
  elements.clearButton.textContent = markdownMessages.clearAction
  elements.downloadButton.textContent = markdownMessages.downloadAction
  elements.outputLabel.textContent = markdownMessages.outputLabel
}

const updateStatus = (
  elements: MarkdownViewerElements,
  messages: Messages,
  state: MarkdownViewerState,
): void => {
  const markdownMessages = messages.markdownViewer
  elements.status.textContent = state.status === 'ready' ? markdownMessages.statusReady : markdownMessages.statusEmpty
}

const resetOutput = (elements: MarkdownViewerElements): void => {
  elements.outputContainer.replaceChildren()
}

const syncCodeBlockHeights = (elements: MarkdownViewerElements): void => {
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

const applyRenderedOutput = (elements: MarkdownViewerElements, state: MarkdownViewerState): void => {
  elements.outputContainer.innerHTML = state.renderedHtml
  syncCodeBlockHeights(elements)
}

const renderMarkdownInput = (
  elements: MarkdownViewerElements,
  state: MarkdownViewerState,
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

export const mountMarkdownViewer = (container: HTMLElement, initialMessages: Messages): void => {
  const root = container.querySelector<HTMLElement>('[data-markdown-viewer-root]') ?? container
  const elements = queryMarkdownViewerElements(container)
  const filePicker = wireFilePicker(root, { onFiles: (files) => void loadFile(files[0]) })
  if (!elements || !filePicker) {
    return
  }

  let messages = initialMessages
  const state = createInitialMarkdownViewerState()
  let renderDelayId: number | null = null

  const syncUi = (): void => {
    syncLocalizedText(elements, messages)
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

  markdownViewerLocale.register(root, syncLocale)

  const updateFileName = (fileName: string | null): void => {
    state.selectedFileName = fileName
    filePicker.setName(fileName ?? messages.markdownViewer.noFileSelected)
  }

  const loadFile = async (file: File): Promise<void> => {
    try {
      updateFileName(file.name)
      state.inputValue = await readFileAsText(file)
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
    filePicker.input.value = ''
    filePicker.setName(messages.markdownViewer.noFileSelected)
    updateStatus(elements, messages, state)
    resetOutput(elements)
    elements.downloadButton.disabled = true
  })

  elements.downloadButton.addEventListener('click', () => {
    if (!state.renderedDocument) {
      return
    }

    const blob = new Blob([state.renderedDocument], { type: 'text/html' })
    downloadBlob(blob, 'markdown.html')
  })

  syncUi()
}

export const updateMarkdownViewerLocale = markdownViewerLocale.update
