import type { Messages } from '../../../i18n/schema.ts'
import { downloadBlob, formatAcceptList, readFileAsText } from '../../foundations/files.ts'
import { queryRequired } from '../../foundations/dom.ts'
import { wireFilePicker } from '../../foundations/file-picker/mount.ts'
import type { MarkdownViewerElements, MarkdownViewerState } from './types.ts'
import { createInitialMarkdownViewerState, renderMarkdownToHtml, wrapHtmlDocument } from './utils.ts'
import type { MountTool } from '../../types.ts'

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

export const mountMarkdownViewer: MountTool = (container, initialMessages) => {
  const elements = queryRequired<MarkdownViewerElements>(container, {
    form: '[data-markdown-viewer-form]',
    uploadLabel: '[data-markdown-viewer-upload-label]',
    uploadHint: '[data-markdown-viewer-upload-hint]',
    input: '[data-markdown-viewer-input]',
    renderButton: '[data-markdown-viewer-render]',
    clearButton: '[data-markdown-viewer-clear]',
    downloadButton: '[data-markdown-viewer-download]',
    inputLabel: '[data-markdown-viewer-input-label]',
    outputLabel: '[data-markdown-viewer-output-label]',
    status: '[data-markdown-viewer-status]',
    outputContainer: '[data-markdown-viewer-output]',
  })
  const filePicker = wireFilePicker(container, { onFiles: (files) => void loadFile(files[0]) })
  if (!elements || !filePicker) {
    return {}
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
  return {
    updateLocale: syncLocale,
    destroy: () => {
      if (renderDelayId !== null) {
        window.clearTimeout(renderDelayId)
      }
    },
  }
}
