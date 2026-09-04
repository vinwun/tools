import {GlobalWorkerOptions} from 'pdfjs-dist'
import {type Locale, messagesByLocale} from '../../../i18n'
import {ACCEPTED_PDF_TYPES, createUniqueId} from '../pdf-tools/utils.ts'
import type {PdfTextExtractorEntry, PdfTextExtractorFormat} from './types.ts'
import {buildDownloadFileName, extractPdfText, isPdfFile} from './utils.ts'

GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

type PdfTextExtractorState = {
  entries: PdfTextExtractorEntry[]
  isBusy: boolean
  outputFormat: PdfTextExtractorFormat
  selectedEntryId: string | null
}

const pdfTextExtractorLocaleSyncers = new WeakMap<HTMLElement, (locale: Locale) => void>()
let stateGeneration = 0

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

const getMessages = (locale: Locale) => messagesByLocale[locale]

const updateEntry = (entries: PdfTextExtractorEntry[], entryId: string, patch: Partial<PdfTextExtractorEntry>): PdfTextExtractorEntry[] =>
  entries.map((entry) => (entry.id === entryId ? { ...entry, ...patch } : entry))

const renderResults = (state: PdfTextExtractorState, locale: Locale): string => {
  const messages = getMessages(locale).pdfTextExtractor

  if (state.entries.length === 0) {
    return `<p class="tool-hint">${messages.resultsEmpty}</p>`
  }

  return state.entries
    .map((entry) => {
      const isSelected = state.selectedEntryId === entry.id
      const statusLabel =
        entry.status === 'ready'
          ? messages.entryStatusReady
          : entry.status === 'error'
            ? messages.entryStatusFailed
            : messages.entryStatusExtracting

      const statusDetail = entry.status === 'error' && entry.error ? ` ${escapeHtml(entry.error)}` : ''
      const previewText = state.outputFormat === 'md' ? entry.markdownText : entry.plainText
      const previewMarkup = entry.status === 'ready'
        ? `<pre class="pdf-text-extractor-preview">${escapeHtml(previewText)}</pre>`
        : `<p class="tool-hint">${messages.previewUnavailable}</p>`

      return `
        <article class="pdf-text-extractor-entry${isSelected ? ' is-selected' : ''}" data-pdf-text-extractor-entry="${entry.id}" aria-selected="${isSelected ? 'true' : 'false'}">
          <header class="pdf-text-extractor-entry-header">
            <div class="pdf-text-extractor-entry-meta">
              <h3 class="pdf-text-extractor-entry-title">${escapeHtml(entry.fileName)}</h3>
            </div>
            <span class="pdf-text-extractor-entry-status${entry.status === 'error' ? ' is-error' : ''}">${statusLabel}${statusDetail}</span>
          </header>
           <div class="pdf-text-extractor-entry-preview">
              ${previewMarkup}
            </div>
         </article>
       `
    })
    .join('')
}

const resolveStatusText = (state: PdfTextExtractorState, locale: Locale): string => {
  const messages = getMessages(locale).pdfTextExtractor

  if (state.isBusy) {
    return messages.statusExtracting
  }

  if (state.entries.length === 0) {
    return messages.statusEmpty
  }

  const readyEntries = state.entries.filter((entry) => entry.status === 'ready')
  const failedEntries = state.entries.filter((entry) => entry.status === 'error')

  if (failedEntries.length > 0) {
    return messages.statusFailed
  }

  if (!state.selectedEntryId || !readyEntries.some((entry) => entry.id === state.selectedEntryId)) {
    return messages.statusReadySelect
  }

  return messages.statusReady
}

export const mountPdfTextExtractor = (container: HTMLElement, locale: Locale): void => {
  stateGeneration += 1
  const root = container.querySelector<HTMLElement>('[data-pdf-text-extractor-root]')
  if (!root) {
    return
  }

  let currentLocale = locale

  const fileInput = root.querySelector<HTMLInputElement>('[data-pdf-text-extractor-file]')
  const browseButton = root.querySelector<HTMLButtonElement>('[data-pdf-text-extractor-browse]')
  const dropzone = root.querySelector<HTMLElement>('[data-pdf-text-extractor-dropzone]')
  const fileNameElement = root.querySelector<HTMLElement>('[data-pdf-text-extractor-file-name]')
  const outputSelect = root.querySelector<HTMLSelectElement>('[data-pdf-text-extractor-output]')
  const downloadSelectedButton = root.querySelector<HTMLButtonElement>('[data-pdf-text-extractor-download-selected]')
  const statusElement = root.querySelector<HTMLElement>('[data-pdf-text-extractor-status]')
  const resultsElement = root.querySelector<HTMLElement>('[data-pdf-text-extractor-results]')

  if (!fileInput || !browseButton || !dropzone || !fileNameElement || !outputSelect || !downloadSelectedButton || !statusElement || !resultsElement) {
    return
  }

  const state: PdfTextExtractorState = {
    entries: [],
    isBusy: false,
    outputFormat: 'md',
    selectedEntryId: null,
  }

  const sync = (): void => {
    statusElement.textContent = resolveStatusText(state, currentLocale)
    resultsElement.innerHTML = renderResults(state, currentLocale)

    const currentFileName = state.entries[0]?.fileName ?? ''
    fileNameElement.textContent = currentFileName || getMessages(currentLocale).pdfTextExtractor.noFileSelected

    const selectedEntry = state.entries.find((entry) => entry.id === state.selectedEntryId) ?? null
    const hasReadySelection = Boolean(selectedEntry && selectedEntry.status === 'ready')

    browseButton.disabled = state.isBusy
    fileInput.disabled = state.isBusy
    downloadSelectedButton.disabled = state.isBusy || !hasReadySelection
  }

  const syncLocale = (nextLocale: Locale): void => {
    currentLocale = nextLocale

    const messages = getMessages(currentLocale).pdfTextExtractor
    const uploadHint = root.querySelector<HTMLElement>('[data-pdf-text-extractor-upload-hint]')
    const outputSelect = root.querySelector<HTMLSelectElement>('[data-pdf-text-extractor-output]')

    if (uploadHint) uploadHint.textContent = `${messages.uploadHintLabel}: ${ACCEPTED_PDF_TYPES.replaceAll(',', ' / ')}`
    if (!state.entries[0]?.fileName) {
      fileNameElement.textContent = messages.noFileSelected
    }
    if (outputSelect) {
      outputSelect.options[0].textContent = messages.outputFormatMarkdown
      outputSelect.options[1].textContent = messages.outputFormatText
    }

    const uploadHeading = root.querySelector<HTMLElement>('.pdf-text-extractor-panel-upload h2')
    const dropHint = root.querySelector<HTMLElement>('.pdf-text-extractor-panel-upload .tool-hint')
    const outputHeading = root.querySelector<HTMLElement>('.pdf-text-extractor-panel-output h2')
    const resultsHeading = root.querySelector<HTMLElement>('.pdf-text-extractor-panel-results h2')

    if (uploadHeading) uploadHeading.textContent = messages.uploadLabel
    if (dropHint) dropHint.textContent = messages.dropHint
    if (outputHeading) outputHeading.textContent = messages.outputTitle
    if (resultsHeading) resultsHeading.textContent = messages.resultsTitle

    browseButton.textContent = messages.browseAction
    downloadSelectedButton.textContent = messages.downloadAction

    sync()
  }

  pdfTextExtractorLocaleSyncers.set(root, syncLocale)

  const setBusy = (busy: boolean): void => {
    state.isBusy = busy
    sync()
  }

  const triggerDownload = (text: string, fileName: string, format: PdfTextExtractorFormat): void => {
    const blob = new Blob([text], { type: format === 'md' ? 'text/markdown' : 'text/plain' })
    const downloadUrl = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = downloadUrl
    anchor.download = buildDownloadFileName(fileName, format)
    anchor.style.display = 'none'

    document.body.append(anchor)
    anchor.click()
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000)
  }

  const extractFiles = async (files: readonly File[]): Promise<void> => {
    const pdfFile = files.find(isPdfFile)
    if (!pdfFile) {
      return
    }

    const generation = ++stateGeneration
    setBusy(true)

    const nextEntry: PdfTextExtractorEntry = {
      id: createUniqueId(),
      file: pdfFile,
      fileName: pdfFile.name,
      status: 'extracting',
      pageCount: null,
      plainText: '',
      markdownText: '',
      error: null,
    }

    state.entries = [nextEntry]
    state.selectedEntryId = nextEntry.id
    sync()

    try {
      const result = await extractPdfText(nextEntry.file)
      if (generation !== stateGeneration) {
        return
      }

      state.entries = updateEntry(state.entries, nextEntry.id, {
        status: 'ready',
        pageCount: result.pageCount,
        plainText: result.plainText,
        markdownText: result.markdownText,
        error: null,
      })
    } catch (error) {
      if (generation !== stateGeneration) {
        return
      }

      state.entries = updateEntry(state.entries, nextEntry.id, {
        status: 'error',
        error: error instanceof Error ? error.message : getMessages(currentLocale).pdfTextExtractor.entryStatusFailed,
      })
    }

    sync()
    setBusy(false)
  }

  browseButton.addEventListener('click', () => {
    fileInput.click()
  })

  fileInput.addEventListener('change', () => {
    const files = Array.from(fileInput.files ?? [])
    fileInput.value = ''
    void extractFiles(files.slice(0, 1))
  })

  dropzone.addEventListener('dragover', (event) => {
    event.preventDefault()
    dropzone.classList.add('is-dragover')
  })

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('is-dragover')
  })

  dropzone.addEventListener('drop', (event) => {
    event.preventDefault()
    dropzone.classList.remove('is-dragover')
    const droppedFiles = Array.from(event.dataTransfer?.files ?? [])
    void extractFiles(droppedFiles.slice(0, 1))
  })

  outputSelect.addEventListener('change', () => {
    state.outputFormat = outputSelect.value === 'txt' ? 'txt' : 'md'
    sync()
  })

  downloadSelectedButton.addEventListener('click', () => {
    if (downloadSelectedButton.disabled) {
      return
    }

    const entry = state.entries.find((item) => item.id === state.selectedEntryId)
    if (!entry || entry.status !== 'ready') {
      return
    }

    const text = state.outputFormat === 'md' ? entry.markdownText : entry.plainText
    triggerDownload(text, entry.fileName, state.outputFormat)
  })

  resultsElement.addEventListener('click', (event) => {
    const target = event.target
    if (!(target instanceof HTMLElement)) {
      return
    }

    const entryCard = target.closest<HTMLElement>('[data-pdf-text-extractor-entry]')
    if (!entryCard) {
      return
    }

    const entryId = entryCard.dataset.pdfTextExtractorEntry
    if (!entryId) {
      return
    }

    state.selectedEntryId = entryId
    sync()
  })

  sync()
}

export const updatePdfTextExtractorLocale = (container: HTMLElement, locale: Locale): void => {
  const root = container.querySelector<HTMLElement>('[data-pdf-text-extractor-root]')
  if (!root) {
    return
  }

  pdfTextExtractorLocaleSyncers.get(root)?.(locale)
}
