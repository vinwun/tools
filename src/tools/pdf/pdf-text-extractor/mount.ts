import type { Messages } from '../../../i18n/schema.ts'
import type { MountTool } from '../../types.ts'
import { configurePdfWorker } from '../pdf-worker.ts'
import { escapeHtml, queryRequired } from '../../foundations/dom.ts'
import { wireFilePicker } from '../../foundations/file-picker/mount.ts'
import { downloadBlob, formatAcceptList } from '../../foundations/files.ts'
import { ACCEPTED_PDF_TYPES, isPdfFile } from '../pdf-utils.ts'
import type { PdfTextExtractorFormat, PdfTextExtractorResult } from './types.ts'
import { buildDownloadFileName, extractPdfText } from './utils.ts'

type PdfTextExtractorState = {
  result: PdfTextExtractorResult | null
  isBusy: boolean
  outputFormat: PdfTextExtractorFormat
}

type PdfTextExtractorElements = {
  uploadLabel: HTMLElement
  dropHint: HTMLElement
  uploadHint: HTMLElement
  outputTitle: HTMLElement
  outputSelect: HTMLSelectElement
  markdownOption: HTMLOptionElement
  textOption: HTMLOptionElement
  downloadButton: HTMLButtonElement
  status: HTMLElement
  resultsTitle: HTMLElement
  results: HTMLElement
}

const renderResult = (state: PdfTextExtractorState, messages: Messages['pdfTextExtractor']): string => {
  const { result } = state
  if (!result) {
    return `<p class="tool-hint">${messages.resultsEmpty}</p>`
  }

  const statusLabel =
    result.status === 'ready'
      ? messages.entryStatusReady
      : result.status === 'error'
        ? messages.entryStatusFailed
        : messages.entryStatusExtracting
  const statusDetail = result.status === 'error' && result.error ? ` ${escapeHtml(result.error)}` : ''
  const previewText = state.outputFormat === 'md' ? result.markdownText : result.plainText
  const previewMarkup = result.status === 'ready'
    ? `<pre class="pdf-text-extractor-preview">${escapeHtml(previewText)}</pre>`
    : `<p class="tool-hint">${messages.previewUnavailable}</p>`

  return `
    <article class="tool-card pdf-text-extractor-entry is-selected">
      <header class="tool-panel-header pdf-text-extractor-entry-header">
        <div class="pdf-text-extractor-entry-meta">
          <h3 class="pdf-text-extractor-entry-title">${escapeHtml(result.fileName)}</h3>
        </div>
        <span class="pdf-text-extractor-entry-status${result.status === 'error' ? ' is-error' : ''}">${statusLabel}${statusDetail}</span>
      </header>
      <div class="pdf-text-extractor-entry-preview">
        ${previewMarkup}
      </div>
    </article>
  `
}

const resolveStatusText = (state: PdfTextExtractorState, messages: Messages['pdfTextExtractor']): string => {
  if (state.isBusy) {
    return messages.statusExtracting
  }

  if (!state.result) {
    return messages.statusEmpty
  }

  return state.result.status === 'error' ? messages.statusFailed : messages.statusReady
}

export const mountPdfTextExtractor: MountTool = (container, initialMessages) => {
  configurePdfWorker()
  const root = container.querySelector<HTMLElement>('[data-pdf-text-extractor-root]')
  const filePicker = root ? wireFilePicker(root, { onFiles: (files) => void extractFile(files.slice(0, 1)) }) : null
  const elements = root
    ? queryRequired<PdfTextExtractorElements>(root, {
        uploadLabel: '[data-pdf-text-extractor-upload-label]',
        dropHint: '[data-pdf-text-extractor-drop-hint]',
        uploadHint: '[data-pdf-text-extractor-upload-hint]',
        outputTitle: '[data-pdf-text-extractor-output-title]',
        outputSelect: '[data-pdf-text-extractor-output]',
        markdownOption: '[data-pdf-text-extractor-output] option[value="md"]',
        textOption: '[data-pdf-text-extractor-output] option[value="txt"]',
        downloadButton: '[data-pdf-text-extractor-download-selected]',
        status: '[data-pdf-text-extractor-status]',
        resultsTitle: '[data-pdf-text-extractor-results-title]',
        results: '[data-pdf-text-extractor-results]',
      })
    : null
  if (!filePicker || !elements) {
    return {}
  }

  let messages = initialMessages
  // Bumped per extraction and on destroy, so a stale extraction never writes its result.
  let generation = 0
  const state: PdfTextExtractorState = {
    result: null,
    isBusy: false,
    outputFormat: 'md',
  }

  const sync = (): void => {
    const pdfMessages = messages.pdfTextExtractor
    elements.status.textContent = resolveStatusText(state, pdfMessages)
    // The preview is rebuilt on every sync (locale, output format), so keep the reader's place.
    const previewScrollTop = elements.results.querySelector('.pdf-text-extractor-preview')?.scrollTop ?? 0
    elements.results.innerHTML = renderResult(state, pdfMessages)
    elements.results.querySelector('.pdf-text-extractor-preview')?.scrollTo({ top: previewScrollTop })
    filePicker.setName(state.result?.fileName || pdfMessages.noFileSelected)
    filePicker.input.disabled = state.isBusy
    elements.downloadButton.disabled = state.isBusy || state.result?.status !== 'ready'
  }

  const syncLocale = (nextMessages: Messages): void => {
    messages = nextMessages
    const pdfMessages = messages.pdfTextExtractor
    elements.uploadLabel.textContent = pdfMessages.uploadLabel
    elements.dropHint.textContent = pdfMessages.dropHint
    elements.uploadHint.textContent = `${pdfMessages.uploadHintLabel}: ${formatAcceptList(ACCEPTED_PDF_TYPES)}`
    filePicker.browseButton.textContent = pdfMessages.browseAction
    elements.outputTitle.textContent = pdfMessages.outputTitle
    elements.outputSelect.setAttribute('aria-label', pdfMessages.outputTitle)
    elements.markdownOption.textContent = pdfMessages.outputFormatMarkdown
    elements.textOption.textContent = pdfMessages.outputFormatText
    elements.downloadButton.textContent = pdfMessages.downloadAction
    elements.resultsTitle.textContent = pdfMessages.resultsTitle
    sync()
  }

  const setBusy = (busy: boolean): void => {
    state.isBusy = busy
    sync()
  }

  const extractFile = async (files: readonly File[]): Promise<void> => {
    const pdfFile = files.find(isPdfFile)
    if (!pdfFile) {
      return
    }

    const currentGeneration = ++generation
    const fileName = pdfFile.name
    state.result = { fileName, status: 'extracting', plainText: '', markdownText: '', error: null }
    setBusy(true)

    try {
      const extracted = await extractPdfText(pdfFile)
      if (currentGeneration !== generation) {
        return
      }

      state.result = {
        fileName,
        status: 'ready',
        plainText: extracted.plainText,
        markdownText: extracted.markdownText,
        error: null,
      }
    } catch (error) {
      if (currentGeneration !== generation) {
        return
      }

      state.result = {
        fileName,
        status: 'error',
        plainText: '',
        markdownText: '',
        error: error instanceof Error ? error.message : messages.pdfTextExtractor.entryStatusFailed,
      }
    }

    setBusy(false)
  }

  elements.outputSelect.addEventListener('change', () => {
    state.outputFormat = elements.outputSelect.value === 'txt' ? 'txt' : 'md'
    sync()
  })

  elements.downloadButton.addEventListener('click', () => {
    const { result, outputFormat } = state
    if (state.isBusy || result?.status !== 'ready') {
      return
    }

    const text = outputFormat === 'md' ? result.markdownText : result.plainText
    const blob = new Blob([text], { type: outputFormat === 'md' ? 'text/markdown' : 'text/plain' })
    downloadBlob(blob, buildDownloadFileName(result.fileName, outputFormat))
  })

  sync()

  return {
    updateLocale: syncLocale,
    destroy: () => {
      generation += 1
    },
  }
}
