import type { Messages } from '../../../i18n/schema.ts'
import { downloadBlob, formatAcceptList, readFileAsText, stripExtension } from '../../foundations/files.ts'
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
    resetOutput(elements)
    elements.downloadButton.disabled = true
    return
  }

  state.renderedHtml = renderMarkdownToHtml(state.inputValue)
  state.status = 'ready'
  applyRenderedOutput(elements, state)
  elements.downloadButton.disabled = false
}

export const mountMarkdownViewer: MountTool = (container, initialMessages) => {
  const elements = queryRequired<MarkdownViewerElements>(container, {
    uploadLabel: '[data-markdown-viewer-upload-label]',
    uploadHint: '[data-markdown-viewer-upload-hint]',
    input: '[data-markdown-viewer-input]',
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

  // Relabels only: the rendered output holds no translated text, and re-rendering is slow for large files.
  const syncLocale = (nextMessages: Messages): void => {
    messages = nextMessages
    syncLocalizedText(elements, messages)
    updateStatus(elements, messages, state)
    filePicker.browseButton.textContent = messages.markdownViewer.uploadAction
    filePicker.setName(state.selectedFileName ?? messages.markdownViewer.noFileSelected)
  }

  const updateFileName = (fileName: string | null): void => {
    state.selectedFileName = fileName
    filePicker.setName(fileName ?? messages.markdownViewer.noFileSelected)
  }

  const clear = (): void => {
    state.inputValue = ''
    state.renderedHtml = ''
    state.status = 'empty'
    state.selectedFileName = null
    elements.input.value = ''
    filePicker.input.value = ''
    filePicker.setName(messages.markdownViewer.noFileSelected)
    updateStatus(elements, messages, state)
    resetOutput(elements)
    elements.downloadButton.disabled = true
  }

  const loadFile = async (file: File): Promise<void> => {
    try {
      updateFileName(file.name)
      state.inputValue = await readFileAsText(file)
      elements.input.value = state.inputValue
      renderMarkdownInput(elements, state)
      updateStatus(elements, messages, state)
    } catch {
      // Keeping the previous output would pair it with the new file name.
      clear()
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

  elements.clearButton.addEventListener('click', clear)

  // A "#heading" link would change the page URL, which the app treats as navigation.
  elements.outputContainer.addEventListener('click', (event) => {
    const href = (event.target as Element).closest('a')?.getAttribute('href')
    if (href?.startsWith('#')) {
      event.preventDefault()
      elements.outputContainer.querySelector(`#${CSS.escape(href.slice(1))}`)?.scrollIntoView()
    }
  })

  elements.downloadButton.addEventListener('click', () => {
    if (!state.renderedHtml) {
      return
    }

    // The UI language is the best available guess for the language the user writes in.
    const title = elements.outputContainer.querySelector('h1, h2, h3')?.textContent?.trim() || 'Markdown'
    const html = wrapHtmlDocument(state.renderedHtml, title, document.documentElement.lang)
    const blob = new Blob([html], { type: 'text/html' })
    downloadBlob(blob, `${state.selectedFileName ? stripExtension(state.selectedFileName) : 'markdown'}.html`)
  })

  return {
    updateLocale: syncLocale,
    destroy: () => {
      if (renderDelayId !== null) {
        window.clearTimeout(renderDelayId)
      }
    },
  }
}
