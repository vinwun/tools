import { PDFDocument } from 'pdf-lib'
import { getDocument, type PDFDocumentProxy } from 'pdfjs-dist'
import { messagesByLocale, type Locale } from '../../../i18n'
import { configurePdfWorker } from '../pdf-worker.ts'
import { ACCEPTED_PDF_TYPES, keepSelectedEntries, moveSelectedEntries, removeSelectedEntries, type PdfPageEntry, PDF_THUMBNAIL_SCALE, buildSelectionRange, countSelectedEntries, createUniqueId, formatMessage } from './utils.ts'

type PdfDropTarget =
  | { kind: 'none' }
  | { kind: 'before'; index: number }
  | { kind: 'end' }

type PdfWorkspaceState = {
  entries: PdfPageEntry[]
  selectedIndices: Set<number>
  anchorIndex: number | null
  isBusy: boolean
  dragIndex: number | null
  dropTarget: PdfDropTarget
}

type PdfShortcutActions = {
  root: HTMLElement
  clearSelection: () => void
  resetDropTarget: () => void
  removeSelectedPages: () => void
  hasSelection: () => boolean
  sync: () => void
}

let activePdfShortcutActions: PdfShortcutActions | null = null
let isPdfShortcutListenerAttached = false
let isPdfOutsideClickListenerAttached = false
const pdfLocaleSyncers = new WeakMap<HTMLElement, (locale: Locale) => void>()

const isEditableTarget = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.matches('input, textarea, select') || target.isContentEditable)

const handlePdfShortcutKeydown = (event: KeyboardEvent): void => {
  const actions = activePdfShortcutActions
  if (!actions || !actions.root.isConnected || isEditableTarget(event.target)) {
    return
  }

  if (event.key === 'Escape') {
    event.preventDefault()
    actions.clearSelection()
    actions.resetDropTarget()
    actions.sync()
    return
  }

  if (event.key !== 'Delete' && event.key !== 'Backspace') {
    return
  }

  event.preventDefault()
  actions.removeSelectedPages()
  actions.sync()
}

const ensurePdfShortcutListener = (): void => {
  if (isPdfShortcutListenerAttached) {
    return
  }

  document.addEventListener('keydown', handlePdfShortcutKeydown)
  isPdfShortcutListenerAttached = true
}

const handlePdfOutsideClick = (event: MouseEvent): void => {
  const actions = activePdfShortcutActions
  if (!actions || !actions.root.isConnected) {
    return
  }

  const pageList = actions.root.querySelector<HTMLElement>('[data-pdf-page-organizer-page-list]')
  if (pageList && event.composedPath().includes(pageList)) {
    return
  }

  if (!actions.hasSelection()) {
    return
  }

  actions.clearSelection()
  actions.resetDropTarget()
  actions.sync()
}

const ensurePdfOutsideClickListener = (): void => {
  if (isPdfOutsideClickListenerAttached) {
    return
  }

  document.addEventListener('click', handlePdfOutsideClick)
  isPdfOutsideClickListenerAttached = true
}

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

const isPdfFile = (file: File): boolean => {
  const lowerName = file.name.toLowerCase()
  return file.type === 'application/pdf' || lowerName.endsWith('.pdf')
}

const updateEntry = (entries: PdfPageEntry[], entryId: string, patch: Partial<PdfPageEntry>): PdfPageEntry[] =>
  entries.map((entry) => (entry.id === entryId ? { ...entry, ...patch } : entry))

const renderThumbnailMarkup = (entry: PdfPageEntry, messages: ReturnType<typeof getMessages>): string => {
  if (entry.thumbnailState === 'ready' && entry.thumbnailUrl) {
    return `<img src="${entry.thumbnailUrl}" alt="${escapeHtml(entry.fileName)}" class="pdf-page-organizer-page-thumbnail-image" />`
  }

  if (entry.thumbnailState === 'failed') {
    return `<div class="pdf-page-organizer-page-thumbnail-fallback pdf-page-organizer-page-thumbnail-fallback-failed">${escapeHtml(entry.thumbnailError ?? messages.pdfPageOrganizer.thumbnailFailed)}</div>`
  }

  return `<div class="pdf-page-organizer-page-thumbnail-fallback">${escapeHtml(messages.pdfPageOrganizer.thumbnailLoading)}</div>`
}

const renderPageCard = (entry: PdfPageEntry, index: number, selected: boolean, dropTarget: PdfDropTarget, messages: ReturnType<typeof getMessages>): string => {
  const entryLabel = formatMessage(messages.pdfPageOrganizer.pageEntryLabel, {
    fileName: entry.fileName,
    page: entry.pageNumber,
    pageCount: entry.pageCount,
  })
  const dropBeforeClass = dropTarget.kind === 'before' && dropTarget.index === index ? ' is-drop-target' : ''

  return `
    <div
      class="pdf-page-organizer-page-card${selected ? ' is-selected' : ''}${dropBeforeClass}"
      data-pdf-page-index="${index}"
      role="option"
      draggable="true"
      tabindex="0"
      aria-selected="${selected ? 'true' : 'false'}"
      aria-label="${escapeHtml(entryLabel)}"
    >
      <div class="pdf-page-organizer-page-thumbnail">
        ${renderThumbnailMarkup(entry, messages)}
      </div>
      <div class="pdf-page-organizer-page-meta">
        <span class="pdf-page-organizer-page-subtitle">${escapeHtml(formatMessage(messages.pdfPageOrganizer.pageEntryLabel, {
          fileName: entry.fileName,
          page: entry.pageNumber,
          pageCount: entry.pageCount,
        }))}</span>
      </div>
    </div>
  `
}

const renderPageList = (state: PdfWorkspaceState, messages: ReturnType<typeof getMessages>): string => {
  if (state.entries.length === 0) {
    return ''
  }

  return state.entries.map((entry, index) => renderPageCard(entry, index, state.selectedIndices.has(index), state.dropTarget, messages)).join('')
}

const getMessages = (locale: Locale) => messagesByLocale[locale]

const setSelection = (state: PdfWorkspaceState, indices: readonly number[], anchorIndex: number | null): void => {
  state.selectedIndices = new Set(indices)
  state.anchorIndex = anchorIndex
}

const setSingleSelection = (state: PdfWorkspaceState, index: number): void => {
  state.selectedIndices = new Set([index])
  state.anchorIndex = index
}

const renderWorkspace = (
  root: HTMLElement,
  state: PdfWorkspaceState,
  locale: Locale,
): void => {
  const messages = getMessages(locale)
  const pageList = root.querySelector<HTMLElement>('[data-pdf-page-organizer-page-list]')
  const summary = root.querySelector<HTMLElement>('[data-pdf-page-organizer-summary]')
  const selectionSummary = root.querySelector<HTMLElement>('[data-pdf-page-organizer-selection-summary]')
  const keepButton = root.querySelector<HTMLButtonElement>('[data-pdf-page-organizer-keep]')
  const removeButton = root.querySelector<HTMLButtonElement>('[data-pdf-page-organizer-remove]')
  const downloadButton = root.querySelector<HTMLButtonElement>('[data-pdf-page-organizer-download]')
  const clearButton = root.querySelector<HTMLButtonElement>('[data-pdf-page-organizer-clear]')

  if (!pageList || !summary || !selectionSummary || !keepButton || !removeButton || !downloadButton || !clearButton) {
    return
  }

  root.classList.toggle('pdf-page-organizer-has-pages', state.entries.length > 0)
  pageList.innerHTML = renderPageList(state, messages)
  summary.textContent =
    state.isBusy
      ? messages.pdfPageOrganizer.uploadingStatus
      : state.entries.length === 0
      ? messages.pdfPageOrganizer.emptyState
      : formatMessage(messages.pdfPageOrganizer.documentsSummary, {
          pages: state.entries.length,
          documents: new Set(state.entries.map((entry) => entry.file)).size,
        })
  selectionSummary.textContent = formatMessage(messages.pdfPageOrganizer.selectedSummary, {
    count: countSelectedEntries(state.selectedIndices),
  })

  const hasEntries = state.entries.length > 0
  const hasSelection = state.selectedIndices.size > 0

  keepButton.disabled = state.isBusy || !hasSelection
  removeButton.disabled = state.isBusy || !hasSelection
  downloadButton.disabled = state.isBusy || !hasEntries
  clearButton.disabled = state.isBusy || !hasEntries
}

const syncPdfStaticTexts = (root: HTMLElement, locale: Locale): void => {
  const messages = getMessages(locale)
  const uploadHeading = root.querySelector<HTMLElement>('.pdf-page-organizer-panel-upload .pdf-page-organizer-panel-header h2')
  const uploadHint = root.querySelector<HTMLElement>('.pdf-page-organizer-panel-upload .tool-hint')
  const uploadHintText = root.querySelector<HTMLElement>('[data-pdf-page-organizer-upload-hint]')
  const browseButton = root.querySelector<HTMLButtonElement>('[data-pdf-page-organizer-browse]')
  const clearButton = root.querySelector<HTMLButtonElement>('[data-pdf-page-organizer-clear]')
  const workspaceHeading = root.querySelector<HTMLElement>('.pdf-page-organizer-workspace-header h2')
  const guidance = root.querySelector<HTMLElement>('[data-pdf-page-organizer-guidance]')
  const reorderHint = root.querySelector<HTMLElement>('.pdf-page-organizer-reorder-hint')
  const endDropTarget = root.querySelector<HTMLElement>('[data-pdf-page-organizer-drop-end]')
  const keepButton = root.querySelector<HTMLButtonElement>('[data-pdf-page-organizer-keep]')
  const removeButton = root.querySelector<HTMLButtonElement>('[data-pdf-page-organizer-remove]')
  const downloadButton = root.querySelector<HTMLButtonElement>('[data-pdf-page-organizer-download]')

  if (uploadHeading) uploadHeading.textContent = messages.pdfPageOrganizer.uploadLabel
  if (uploadHint) uploadHint.textContent = messages.pdfPageOrganizer.dropHint
  if (uploadHintText) uploadHintText.textContent = `${messages.pdfPageOrganizer.uploadHintLabel}: ${ACCEPTED_PDF_TYPES.replaceAll(',', ' / ')}`
  if (browseButton) browseButton.textContent = messages.pdfPageOrganizer.browseAction
  if (clearButton) clearButton.textContent = messages.pdfPageOrganizer.clearAction
  if (workspaceHeading) workspaceHeading.textContent = messages.pdfPageOrganizer.pageListTitle
  if (guidance) guidance.textContent = messages.pdfPageOrganizer.selectionHint
  if (reorderHint) reorderHint.textContent = messages.pdfPageOrganizer.reorderHint
  if (endDropTarget) endDropTarget.textContent = messages.pdfPageOrganizer.moveToEndHint
  if (keepButton) keepButton.textContent = messages.pdfPageOrganizer.keepSelectedAction
  if (removeButton) removeButton.textContent = messages.pdfPageOrganizer.removeSelectedAction
  if (downloadButton) downloadButton.textContent = messages.pdfPageOrganizer.downloadAction
}

const clearDropTarget = (state: PdfWorkspaceState): void => {
  state.dropTarget = { kind: 'none' }
}

const loadThumbnail = async (
  pdfDocument: PDFDocumentProxy,
  entryId: string,
  pageNumber: number,
  locale: Locale,
  root: HTMLElement,
  state: PdfWorkspaceState,
  generation: number,
): Promise<void> => {
  try {
    const page = await pdfDocument.getPage(pageNumber)
    const viewport = page.getViewport({ scale: PDF_THUMBNAIL_SCALE })
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')

    if (!context) {
      state.entries = updateEntry(state.entries, entryId, {
        thumbnailState: 'failed',
        thumbnailUrl: null,
        thumbnailError: getMessages(locale).pdfPageOrganizer.thumbnailFailed,
      })
      renderWorkspace(root, state, locale)
      return
    }

    canvas.width = Math.max(1, Math.floor(viewport.width))
    canvas.height = Math.max(1, Math.floor(viewport.height))

    await page.render({ canvas, canvasContext: context, viewport }).promise
    if (generation !== stateGeneration) {
      return
    }

    const dataUrl = canvas.toDataURL('image/png')
    state.entries = updateEntry(state.entries, entryId, {
      thumbnailState: 'ready',
      thumbnailUrl: dataUrl,
      thumbnailError: null,
    })
    renderWorkspace(root, state, locale)
  } catch (error) {
    if (generation !== stateGeneration) {
      return
    }

    state.entries = updateEntry(state.entries, entryId, {
      thumbnailState: 'failed',
      thumbnailUrl: null,
      thumbnailError: error instanceof Error ? error.message : getMessages(locale).pdfPageOrganizer.thumbnailFailed,
    })
    renderWorkspace(root, state, locale)
  }
}

let stateGeneration = 0

export const mountPdfPageOrganizer = (container: HTMLElement, locale: Locale): void => {
  configurePdfWorker()
  stateGeneration += 1
  const root = container.querySelector<HTMLElement>('[data-pdf-page-organizer-root]')
  if (!root) {
    return
  }

  let currentLocale = locale

  const fileInput = root.querySelector<HTMLInputElement>('[data-pdf-page-organizer-file]')
  const browseButton = root.querySelector<HTMLButtonElement>('[data-pdf-page-organizer-browse]')
  const clearButton = root.querySelector<HTMLButtonElement>('[data-pdf-page-organizer-clear]')
  const dropzone = root.querySelector<HTMLElement>('[data-pdf-page-organizer-dropzone]')
  const pageList = root.querySelector<HTMLElement>('[data-pdf-page-organizer-page-list]')
  const listShell = root.querySelector<HTMLElement>('.pdf-page-organizer-list-shell')
  const endDropTarget = root.querySelector<HTMLElement>('[data-pdf-page-organizer-drop-end]')
  const keepButton = root.querySelector<HTMLButtonElement>('[data-pdf-page-organizer-keep]')
  const removeButton = root.querySelector<HTMLButtonElement>('[data-pdf-page-organizer-remove]')
  const downloadButton = root.querySelector<HTMLButtonElement>('[data-pdf-page-organizer-download]')

  if (!fileInput || !browseButton || !clearButton || !dropzone || !pageList || !listShell || !endDropTarget || !keepButton || !removeButton || !downloadButton) {
    return
  }

  const state: PdfWorkspaceState = {
    entries: [],
    selectedIndices: new Set(),
    anchorIndex: null,
    isBusy: false,
    dragIndex: null,
    dropTarget: { kind: 'none' },
  }

  const sync = (): void => {
    const scrollLeft = listShell.scrollLeft
    const scrollTop = listShell.scrollTop
    renderWorkspace(root, state, currentLocale)
    const restoreScroll = (): void => {
      listShell.scrollLeft = scrollLeft
      listShell.scrollTop = scrollTop
    }

    restoreScroll()
    window.requestAnimationFrame(restoreScroll)
    window.setTimeout(restoreScroll, 0)
  }

  const syncLocale = (nextLocale: Locale): void => {
    currentLocale = nextLocale
    syncPdfStaticTexts(root, currentLocale)

    const messages = getMessages(currentLocale)
    const summary = root.querySelector<HTMLElement>('[data-pdf-page-organizer-summary]')
    const selectionSummary = root.querySelector<HTMLElement>('[data-pdf-page-organizer-selection-summary]')
    const keepButton = root.querySelector<HTMLButtonElement>('[data-pdf-page-organizer-keep]')
    const removeButton = root.querySelector<HTMLButtonElement>('[data-pdf-page-organizer-remove]')
    const downloadButton = root.querySelector<HTMLButtonElement>('[data-pdf-page-organizer-download]')
    const clearButton = root.querySelector<HTMLButtonElement>('[data-pdf-page-organizer-clear]')

    if (summary) {
      summary.textContent = state.isBusy
        ? messages.pdfPageOrganizer.uploadingStatus
        : state.entries.length === 0
          ? messages.pdfPageOrganizer.emptyState
          : formatMessage(messages.pdfPageOrganizer.documentsSummary, {
              pages: state.entries.length,
              documents: new Set(state.entries.map((entry) => entry.file)).size,
            })
    }

    if (selectionSummary) {
      selectionSummary.textContent = formatMessage(messages.pdfPageOrganizer.selectedSummary, {
        count: countSelectedEntries(state.selectedIndices),
      })
    }

    const hasEntries = state.entries.length > 0
    const hasSelection = state.selectedIndices.size > 0

    if (keepButton) keepButton.disabled = state.isBusy || !hasSelection
    if (removeButton) removeButton.disabled = state.isBusy || !hasSelection
    if (downloadButton) downloadButton.disabled = state.isBusy || !hasEntries
    if (clearButton) clearButton.disabled = state.isBusy || !hasEntries
  }

  pdfLocaleSyncers.set(root, syncLocale)

  const clearSelection = (): void => {
    state.selectedIndices = new Set()
    state.anchorIndex = null
  }

  const setBusy = (busy: boolean): void => {
    state.isBusy = busy
    browseButton.disabled = busy
    fileInput.disabled = busy
  }

  const resetDropTarget = (): void => {
    state.dropTarget = { kind: 'none' }
    sync()
  }

  const handlePageListWheel = (event: WheelEvent): void => {
    const horizontalScroll = event.deltaX !== 0 ? event.deltaX : event.deltaY
    if (horizontalScroll === 0 || listShell.scrollWidth <= listShell.clientWidth) {
      return
    }

    event.preventDefault()
    listShell.scrollLeft += horizontalScroll
  }

  const selectRange = (index: number): void => {
    if (state.anchorIndex === null) {
      setSingleSelection(state, index)
      sync()
      return
    }

    setSelection(state, buildSelectionRange(state.anchorIndex, index), state.anchorIndex)
    sync()
  }

  const selectOrToggle = (index: number, forceSingle = false, modifierSelection = false): void => {
    if (forceSingle) {
      setSingleSelection(state, index)
      sync()
      return
    }

    if (modifierSelection) {
      const nextSelection = new Set(state.selectedIndices)
      if (nextSelection.has(index)) {
        nextSelection.delete(index)
      } else {
        nextSelection.add(index)
      }
      state.selectedIndices = nextSelection
      state.anchorIndex = index
      sync()
      return
    }

    setSingleSelection(state, index)
    sync()
  }

  const applyKeep = (): void => {
    if (state.selectedIndices.size === 0) {
      return
    }

    state.entries = keepSelectedEntries(state.entries, state.selectedIndices)
    clearSelection()
    state.dropTarget = { kind: 'none' }
    sync()
  }

  const applyRemove = (): void => {
    if (state.selectedIndices.size === 0) {
      return
    }

    state.entries = removeSelectedEntries(state.entries, state.selectedIndices)
    clearSelection()
    state.dropTarget = { kind: 'none' }
    sync()
  }

  const applyMove = (targetIndex: number | null): void => {
    if (state.selectedIndices.size === 0) {
      return
    }

    state.entries = moveSelectedEntries(state.entries, state.selectedIndices, targetIndex)
    clearSelection()
    state.dropTarget = { kind: 'none' }
    sync()
  }

  const exportPdf = async (): Promise<void> => {
    if (state.entries.length === 0) {
      return
    }

    try {
      const exportDocument = await PDFDocument.create()
      const loadedDocuments = new Map<File, PDFDocument>()
      const copiedPages = [] as Awaited<ReturnType<PDFDocument['copyPages']>>

      for (const entry of state.entries) {
        let sourceDocument = loadedDocuments.get(entry.file)
        if (!sourceDocument) {
          const sourceBuffer = await entry.file.arrayBuffer()
          sourceDocument = await PDFDocument.load(sourceBuffer)
          loadedDocuments.set(entry.file, sourceDocument)
        }

        const [copiedPage] = await exportDocument.copyPages(sourceDocument, [entry.pageNumber - 1])
        copiedPages.push(copiedPage)
      }

      copiedPages.forEach((page) => exportDocument.addPage(page))

      const pdfBytes = await exportDocument.save()
      const pdfArrayBuffer = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength) as ArrayBuffer
      const blob = new Blob([pdfArrayBuffer], { type: 'application/pdf' })
      const downloadUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = downloadUrl
      anchor.download = 'pdf-page-organizer-export.pdf'
      anchor.style.display = 'none'
      document.body.append(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000)
    } catch (error) {
      console.error(error)
    }
  }

  const appendFiles = async (files: readonly File[]): Promise<void> => {
    const pdfFiles = files.filter(isPdfFile)
    if (pdfFiles.length === 0) {
      return
    }

    const generation = ++stateGeneration
    setBusy(true)
    sync()

    for (const file of pdfFiles) {
      try {
        const bytes = new Uint8Array(await file.arrayBuffer())
        const loadingTask = getDocument({ data: bytes })
        const pdfDocument = await loadingTask.promise
        const pageCount = pdfDocument.numPages
        const nextEntries: PdfPageEntry[] = []

        for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
          const entry: PdfPageEntry = {
            id: createUniqueId(),
            file,
            fileName: file.name,
            pageNumber,
            pageCount,
            thumbnailState: 'loading',
            thumbnailUrl: null,
            thumbnailError: null,
          }

          state.entries.push(entry)
          nextEntries.push(entry)
        }
        sync()

        for (const entry of nextEntries) {
          void loadThumbnail(pdfDocument, entry.id, entry.pageNumber, currentLocale, root, state, generation)
        }
      } catch (error) {
        console.error(error)
      }
    }

    setBusy(false)
    clearDropTarget(state)
    sync()
  }

  const handlePageSelection = (index: number, event: MouseEvent | KeyboardEvent): void => {
    const isModifierSelection = event.ctrlKey || event.metaKey

    if ('shiftKey' in event && event.shiftKey) {
      selectRange(index)
      return
    }

    selectOrToggle(index, false, isModifierSelection)
  }

  const setDropTarget = (dropTarget: PdfDropTarget): void => {
    state.dropTarget = dropTarget
    sync()
  }

  browseButton.addEventListener('click', () => {
    fileInput.click()
  })

  fileInput.addEventListener('change', () => {
    const files = Array.from(fileInput.files ?? [])
    fileInput.value = ''
    void appendFiles(files)
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
    void appendFiles(Array.from(event.dataTransfer?.files ?? []))
  })

  clearButton.addEventListener('click', () => {
    stateGeneration += 1
    state.entries = []
    clearSelection()
    state.dropTarget = { kind: 'none' }
    sync()
  })

  keepButton.addEventListener('click', () => {
    applyKeep()
    sync()
  })

  removeButton.addEventListener('click', () => {
    applyRemove()
    sync()
  })

  downloadButton.addEventListener('click', () => {
    void exportPdf()
  })

  pageList.addEventListener('click', (event) => {
    const target = event.target
    if (!(target instanceof HTMLElement)) {
      return
    }

    const card = target.closest<HTMLElement>('[data-pdf-page-index]')
    if (!card) {
      return
    }

    const rawIndex = card.dataset.pdfPageIndex
    if (!rawIndex) {
      return
    }

    const index = Number.parseInt(rawIndex, 10)
    if (Number.isNaN(index)) {
      return
    }

    card.focus()
    handlePageSelection(index, event as MouseEvent)
  })

  pageList.addEventListener('keydown', (event) => {
    const target = event.target
    if (!(target instanceof HTMLElement)) {
      return
    }

    const card = target.closest<HTMLElement>('[data-pdf-page-index]')
    if (!card) {
      return
    }

    if (event.key !== 'Enter' && event.key !== ' ') {
      return
    }

    const rawIndex = card.dataset.pdfPageIndex
    if (!rawIndex) {
      return
    }

    event.preventDefault()
    const index = Number.parseInt(rawIndex, 10)
    if (Number.isNaN(index)) {
      return
    }

    handlePageSelection(index, event)
  })

  listShell.addEventListener('wheel', handlePageListWheel, { passive: false })

  pageList.addEventListener('dragstart', (event) => {
    const target = event.target
    if (!(target instanceof HTMLElement)) {
      return
    }

    const card = target.closest<HTMLElement>('[data-pdf-page-index]')
    if (!card) {
      return
    }

    const rawIndex = card.dataset.pdfPageIndex
    if (!rawIndex) {
      return
    }

    const index = Number.parseInt(rawIndex, 10)
    if (Number.isNaN(index)) {
      return
    }

    if (!state.selectedIndices.has(index)) {
      setSingleSelection(state, index)
    }

    state.dragIndex = index
    event.dataTransfer?.setData('text/plain', String(index))
    event.dataTransfer?.setDragImage(card, 16, 16)
    event.dataTransfer!.effectAllowed = 'move'
  })

  pageList.addEventListener('dragend', () => {
    state.dragIndex = null
    resetDropTarget()
  })

  pageList.addEventListener('dragover', (event) => {
    const target = event.target
    if (!(target instanceof HTMLElement)) {
      return
    }

    const card = target.closest<HTMLElement>('[data-pdf-page-index]')
    if (!card) {
      return
    }

    const rawIndex = card.dataset.pdfPageIndex
    if (!rawIndex) {
      return
    }

    const index = Number.parseInt(rawIndex, 10)
    if (Number.isNaN(index)) {
      return
    }

    event.preventDefault()
    if (state.dropTarget.kind !== 'before' || state.dropTarget.index !== index) {
      setDropTarget({ kind: 'before', index })
    }
  })

  pageList.addEventListener('drop', (event) => {
    const target = event.target
    if (!(target instanceof HTMLElement)) {
      return
    }

    const card = target.closest<HTMLElement>('[data-pdf-page-index]')
    if (!card) {
      return
    }

    const rawIndex = card.dataset.pdfPageIndex
    if (!rawIndex) {
      return
    }

    const index = Number.parseInt(rawIndex, 10)
    if (Number.isNaN(index)) {
      return
    }

    event.preventDefault()
    applyMove(index)
    sync()
  })

  endDropTarget.addEventListener('dragover', (event) => {
    event.preventDefault()
    setDropTarget({ kind: 'end' })
  })

  endDropTarget.addEventListener('drop', (event) => {
    event.preventDefault()
    applyMove(null)
    sync()
  })

  root.addEventListener('dragenter', (event) => {
    const target = event.target
    if (!(target instanceof HTMLElement)) {
      return
    }

    if (target.closest<HTMLElement>('[data-pdf-page-organizer-dropzone]')) {
      dropzone.classList.add('is-dragover')
    }
  })

  activePdfShortcutActions = {
    root,
    clearSelection,
    hasSelection: () => state.selectedIndices.size > 0,
    resetDropTarget,
    removeSelectedPages: applyRemove,
    sync,
  }
  ensurePdfShortcutListener()
  ensurePdfOutsideClickListener()

  sync()
}

export const updatePdfPageOrganizerLocale = (container: HTMLElement, locale: Locale): void => {
  const root = container.querySelector<HTMLElement>('[data-pdf-page-organizer-root]')
  if (!root) {
    return
  }

  pdfLocaleSyncers.get(root)?.(locale)
}
