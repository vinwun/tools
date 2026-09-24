import { PDFDocument } from 'pdf-lib'
import { getDocument, type PDFDocumentProxy } from 'pdfjs-dist'
import type { Messages } from '../../../i18n/schema.ts'
import type { MountTool } from '../../types.ts'
import { configurePdfWorker } from '../pdf-worker.ts'
import { keepSelectedEntries, moveSelectedEntries, removeSelectedEntries, type PdfPageEntry, PDF_THUMBNAIL_SCALE, buildSelectionRange, countSelectedEntries } from './utils.ts'
import { createUniqueId, escapeHtml, formatMessage, queryRequired } from '../../foundations/dom.ts'
import { wireFilePicker } from '../../foundations/file-picker/mount.ts'
import { downloadBlob, formatAcceptList } from '../../foundations/files.ts'
import { clamp } from '../../foundations/numbers.ts'
import { ACCEPTED_PDF_TYPES, isPdfFile } from '../pdf-utils.ts'

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

type PdfPageOrganizerElements = {
  uploadLabel: HTMLElement
  dropHint: HTMLElement
  uploadHint: HTMLElement
  clearButton: HTMLButtonElement
  pageListTitle: HTMLElement
  summary: HTMLElement
  selectionSummary: HTMLElement
  guidance: HTMLElement
  listShell: HTMLElement
  pageList: HTMLElement
  endDropTarget: HTMLElement
  reorderHint: HTMLElement
  keepButton: HTMLButtonElement
  removeButton: HTMLButtonElement
  moveLeftButton: HTMLButtonElement
  moveRightButton: HTMLButtonElement
  downloadButton: HTMLButtonElement
}

const isEditableTarget = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.matches('input, textarea, select') || target.isContentEditable)

const getCardIndex = (event: Event): { card: HTMLElement; index: number } | null => {
  const card = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>('[data-pdf-page-index]') : null
  const index = Number.parseInt(card?.dataset.pdfPageIndex ?? '', 10)
  return card && !Number.isNaN(index) ? { card, index } : null
}

const updateEntry = (entries: PdfPageEntry[], entryId: string, patch: Partial<PdfPageEntry>): PdfPageEntry[] =>
  entries.map((entry) => (entry.id === entryId ? { ...entry, ...patch } : entry))

const renderThumbnailMarkup = (entry: PdfPageEntry, messages: Messages): string => {
  if (entry.thumbnailState === 'ready' && entry.thumbnailUrl) {
    return `<img src="${entry.thumbnailUrl}" alt="" class="pdf-page-organizer-page-thumbnail-image" />`
  }

  if (entry.thumbnailState === 'failed') {
    return `<div class="pdf-page-organizer-page-thumbnail-fallback pdf-page-organizer-page-thumbnail-fallback-failed">${escapeHtml(messages.pdfPageOrganizer.thumbnailFailed)}</div>`
  }

  return `<div class="pdf-page-organizer-page-thumbnail-fallback">${escapeHtml(messages.pdfPageOrganizer.thumbnailLoading)}</div>`
}

const renderPageCard = (entry: PdfPageEntry, index: number, selected: boolean, dropTarget: PdfDropTarget, messages: Messages): string => {
  const entryLabel = formatMessage(messages.pdfPageOrganizer.pageEntryLabel, {
    fileName: entry.fileName,
    page: entry.pageNumber,
    pageCount: entry.pageCount,
  })
  const dropBeforeClass = dropTarget.kind === 'before' && dropTarget.index === index ? ' is-drop-target' : ''

  return `
    <div
      class="tool-card pdf-page-organizer-page-card${selected ? ' is-selected' : ''}${dropBeforeClass}"
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
        <span class="pdf-page-organizer-page-subtitle">${escapeHtml(entryLabel)}</span>
      </div>
    </div>
  `
}

const renderPageList = (state: PdfWorkspaceState, messages: Messages): string =>
  state.entries.map((entry, index) => renderPageCard(entry, index, state.selectedIndices.has(index), state.dropTarget, messages)).join('')

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
  elements: PdfPageOrganizerElements,
  state: PdfWorkspaceState,
  messages: Messages,
): void => {
  const pdfMessages = messages.pdfPageOrganizer
  root.classList.toggle('pdf-page-organizer-has-pages', state.entries.length > 0)
  elements.pageList.innerHTML = renderPageList(state, messages)
  elements.summary.textContent =
    state.isBusy
      ? pdfMessages.uploadingStatus
      : state.entries.length === 0
      ? pdfMessages.emptyState
      : formatMessage(pdfMessages.documentsSummary, {
          pages: state.entries.length,
          documents: new Set(state.entries.map((entry) => entry.file)).size,
        })
  elements.selectionSummary.textContent = formatMessage(pdfMessages.selectedSummary, {
    count: countSelectedEntries(state.selectedIndices),
  })

  const hasEntries = state.entries.length > 0
  const hasSelection = state.selectedIndices.size > 0
  const blockIndex = hasSelection ? Math.min(...state.selectedIndices) : 0
  const remainingCount = state.entries.length - state.selectedIndices.size

  elements.keepButton.disabled = state.isBusy || !hasSelection
  elements.removeButton.disabled = state.isBusy || !hasSelection
  elements.downloadButton.disabled = state.isBusy || !hasEntries
  elements.clearButton.disabled = state.isBusy || !hasEntries
  elements.moveLeftButton.disabled = state.isBusy || !hasSelection || blockIndex === 0
  elements.moveRightButton.disabled = state.isBusy || !hasSelection || blockIndex >= remainingCount
}

const syncStaticTexts = (elements: PdfPageOrganizerElements, browseButton: HTMLButtonElement, messages: Messages): void => {
  const pdfMessages = messages.pdfPageOrganizer
  elements.uploadLabel.textContent = pdfMessages.uploadLabel
  elements.dropHint.textContent = pdfMessages.dropHint
  elements.uploadHint.textContent = `${pdfMessages.uploadHintLabel}: ${formatAcceptList(ACCEPTED_PDF_TYPES)}`
  browseButton.textContent = pdfMessages.browseAction
  elements.clearButton.textContent = pdfMessages.clearAction
  elements.pageListTitle.textContent = pdfMessages.pageListTitle
  elements.pageList.setAttribute('aria-label', pdfMessages.pageListTitle)
  elements.guidance.textContent = pdfMessages.selectionHint
  elements.reorderHint.textContent = pdfMessages.reorderHint
  elements.endDropTarget.textContent = pdfMessages.moveToEndHint
  elements.keepButton.textContent = pdfMessages.keepSelectedAction
  elements.removeButton.textContent = pdfMessages.removeSelectedAction
  elements.moveLeftButton.textContent = pdfMessages.moveLeftAction
  elements.moveRightButton.textContent = pdfMessages.moveRightAction
  elements.downloadButton.textContent = pdfMessages.downloadAction
}

export const mountPdfPageOrganizer: MountTool = (container, initialMessages) => {
  configurePdfWorker()
  const root = container.querySelector<HTMLElement>('[data-pdf-page-organizer-root]')
  const filePicker = root ? wireFilePicker(root, { onFiles: (files) => void appendFiles([...files]) }) : null
  const elements = root
    ? queryRequired<PdfPageOrganizerElements>(root, {
        uploadLabel: '[data-pdf-page-organizer-upload-label]',
        dropHint: '[data-pdf-page-organizer-drop-hint]',
        uploadHint: '[data-pdf-page-organizer-upload-hint]',
        clearButton: '[data-pdf-page-organizer-clear]',
        pageListTitle: '[data-pdf-page-organizer-page-list-title]',
        summary: '[data-pdf-page-organizer-summary]',
        selectionSummary: '[data-pdf-page-organizer-selection-summary]',
        guidance: '[data-pdf-page-organizer-guidance]',
        listShell: '[data-pdf-page-organizer-list-shell]',
        pageList: '[data-pdf-page-organizer-page-list]',
        endDropTarget: '[data-pdf-page-organizer-drop-end]',
        reorderHint: '[data-pdf-page-organizer-reorder-hint]',
        keepButton: '[data-pdf-page-organizer-keep]',
        removeButton: '[data-pdf-page-organizer-remove]',
        moveLeftButton: '[data-pdf-page-organizer-move-left]',
        moveRightButton: '[data-pdf-page-organizer-move-right]',
        downloadButton: '[data-pdf-page-organizer-download]',
      })
    : null
  if (!root || !filePicker || !elements) {
    return {}
  }

  const { listShell, pageList, endDropTarget } = elements
  const listeners = new AbortController()
  const loadedDocuments: PDFDocumentProxy[] = []
  let messages = initialMessages
  // Bumped on every load, clear and destroy, so thumbnails of a stale batch are discarded.
  let generation = 0

  const state: PdfWorkspaceState = {
    entries: [],
    selectedIndices: new Set(),
    anchorIndex: null,
    isBusy: false,
    dragIndex: null,
    dropTarget: { kind: 'none' },
  }

  const restoreListScroll = ({ left, top }: { left: number; top: number }): void => {
    const restore = (): void => {
      listShell.scrollLeft = left
      listShell.scrollTop = top
    }

    restore()
    window.requestAnimationFrame(restore)
    window.setTimeout(restore, 0)
  }

  const sync = (): void => {
    const scroll = { left: listShell.scrollLeft, top: listShell.scrollTop }
    renderWorkspace(root, elements, state, messages)
    restoreListScroll(scroll)
  }

  const syncLocale = (nextMessages: Messages): void => {
    messages = nextMessages
    syncStaticTexts(elements, filePicker.browseButton, messages)
    sync()
  }

  const releaseDocuments = (): void => {
    loadedDocuments.splice(0).forEach((pdfDocument) => void pdfDocument.destroy())
  }

  const loadThumbnail = async (
    pdfDocument: PDFDocumentProxy,
    entryId: string,
    pageNumber: number,
    thumbnailGeneration: number,
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
        })
        sync()
        return
      }

      canvas.width = Math.max(1, Math.floor(viewport.width))
      canvas.height = Math.max(1, Math.floor(viewport.height))

      await page.render({ canvas, canvasContext: context, viewport }).promise
      if (thumbnailGeneration !== generation) {
        return
      }

      state.entries = updateEntry(state.entries, entryId, {
        thumbnailState: 'ready',
        thumbnailUrl: canvas.toDataURL('image/png'),
      })
      sync()
    } catch (error) {
      if (thumbnailGeneration !== generation) {
        return
      }

      state.entries = updateEntry(state.entries, entryId, {
        thumbnailState: 'failed',
        thumbnailUrl: null,
      })
      console.error(error)
      sync()
    }
  }

  const clearSelection = (): void => {
    state.selectedIndices = new Set()
    state.anchorIndex = null
  }

  const setBusy = (busy: boolean): void => {
    state.isBusy = busy
    filePicker.browseButton.disabled = busy
    filePicker.input.disabled = busy
  }

  const setDropTarget = (dropTarget: PdfDropTarget): void => {
    state.dropTarget = dropTarget
    sync()
  }

  const resetDropTarget = (): void => {
    setDropTarget({ kind: 'none' })
  }

  const handlePageListWheel = (event: WheelEvent): void => {
    const horizontalScroll = event.deltaX !== 0 ? event.deltaX : event.deltaY
    if (horizontalScroll === 0 || listShell.scrollWidth <= listShell.clientWidth) {
      return
    }

    event.preventDefault()
    listShell.scrollLeft += horizontalScroll
  }

  const handlePageSelection = (index: number, event: MouseEvent | KeyboardEvent): void => {
    if (event.shiftKey && state.anchorIndex !== null) {
      setSelection(state, buildSelectionRange(state.anchorIndex, index), state.anchorIndex)
    } else if (!event.shiftKey && (event.ctrlKey || event.metaKey)) {
      const nextSelection = new Set(state.selectedIndices)
      if (nextSelection.has(index)) {
        nextSelection.delete(index)
      } else {
        nextSelection.add(index)
      }
      state.selectedIndices = nextSelection
      state.anchorIndex = index
    } else {
      setSingleSelection(state, index)
    }

    sync()
  }

  const replaceEntries = (entries: PdfPageEntry[]): void => {
    state.entries = entries
    clearSelection()
    resetDropTarget()
  }

  const applyKeep = (): void => {
    if (state.selectedIndices.size > 0) {
      replaceEntries(keepSelectedEntries(state.entries, state.selectedIndices))
    }
  }

  const applyRemove = (): void => {
    if (state.selectedIndices.size > 0) {
      replaceEntries(removeSelectedEntries(state.entries, state.selectedIndices))
    }
  }

  const applyMove = (targetIndex: number | null): void => {
    if (state.selectedIndices.size > 0) {
      replaceEntries(moveSelectedEntries(state.entries, state.selectedIndices, targetIndex))
    }
  }

  // HTML5 drag and drop never fires for touch input, so reordering needs buttons too.
  const applyMoveBy = (offset: number): void => {
    if (state.selectedIndices.size === 0) {
      return
    }

    const selectedCount = state.selectedIndices.size
    const blockIndex = Math.min(...state.selectedIndices)
    const remainingCount = state.entries.length - selectedCount
    const targetIndex = clamp(blockIndex + offset, 0, remainingCount)

    if (targetIndex === blockIndex) {
      return
    }

    state.entries = moveSelectedEntries(state.entries, state.selectedIndices, targetIndex)
    setSelection(
      state,
      Array.from({ length: selectedCount }, (_, position) => targetIndex + position),
      targetIndex,
    )
    resetDropTarget()
  }

  const exportPdf = async (): Promise<void> => {
    if (state.entries.length === 0) {
      return
    }

    try {
      const exportDocument = await PDFDocument.create()
      const sourceDocuments = new Map<File, PDFDocument>()
      const copiedPages = [] as Awaited<ReturnType<PDFDocument['copyPages']>>

      for (const entry of state.entries) {
        let sourceDocument = sourceDocuments.get(entry.file)
        if (!sourceDocument) {
          const sourceBuffer = await entry.file.arrayBuffer()
          sourceDocument = await PDFDocument.load(sourceBuffer)
          sourceDocuments.set(entry.file, sourceDocument)
        }

        const [copiedPage] = await exportDocument.copyPages(sourceDocument, [entry.pageNumber - 1])
        copiedPages.push(copiedPage)
      }

      copiedPages.forEach((page) => exportDocument.addPage(page))

      const pdfBytes = await exportDocument.save()
      const pdfArrayBuffer = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength) as ArrayBuffer
      const blob = new Blob([pdfArrayBuffer], { type: 'application/pdf' })
      downloadBlob(blob, 'pdf-page-organizer-export.pdf')
    } catch (error) {
      console.error(error)
    }
  }

  const appendFiles = async (files: readonly File[]): Promise<void> => {
    const pdfFiles = files.filter(isPdfFile)
    if (pdfFiles.length === 0) {
      return
    }

    const batchGeneration = ++generation
    setBusy(true)
    sync()

    for (const file of pdfFiles) {
      try {
        const bytes = new Uint8Array(await file.arrayBuffer())
        const pdfDocument = await getDocument({ data: bytes }).promise
        if (listeners.signal.aborted) {
          void pdfDocument.destroy()
          return
        }

        loadedDocuments.push(pdfDocument)
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
          }

          state.entries.push(entry)
          nextEntries.push(entry)
        }
        sync()

        for (const entry of nextEntries) {
          void loadThumbnail(pdfDocument, entry.id, entry.pageNumber, batchGeneration)
        }
      } catch (error) {
        console.error(error)
      }
    }

    setBusy(false)
    resetDropTarget()
  }

  elements.clearButton.addEventListener('click', () => {
    generation += 1
    releaseDocuments()
    replaceEntries([])
  })

  elements.keepButton.addEventListener('click', applyKeep)
  elements.removeButton.addEventListener('click', applyRemove)
  elements.moveLeftButton.addEventListener('click', () => applyMoveBy(-1))
  elements.moveRightButton.addEventListener('click', () => applyMoveBy(1))
  elements.downloadButton.addEventListener('click', () => void exportPdf())

  pageList.addEventListener('click', (event) => {
    const hit = getCardIndex(event)
    if (!hit) {
      return
    }

    hit.card.focus()
    handlePageSelection(hit.index, event)
  })

  pageList.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return
    }

    const hit = getCardIndex(event)
    if (!hit) {
      return
    }

    event.preventDefault()
    handlePageSelection(hit.index, event)
  })

  listShell.addEventListener('wheel', handlePageListWheel, { passive: false })

  pageList.addEventListener('dragstart', (event) => {
    const hit = getCardIndex(event)
    if (!hit) {
      return
    }

    if (!state.selectedIndices.has(hit.index)) {
      setSingleSelection(state, hit.index)
    }

    state.dragIndex = hit.index
    event.dataTransfer?.setData('text/plain', String(hit.index))
    event.dataTransfer?.setDragImage(hit.card, 16, 16)
    event.dataTransfer!.effectAllowed = 'move'
  })

  pageList.addEventListener('dragend', () => {
    state.dragIndex = null
    resetDropTarget()
  })

  pageList.addEventListener('dragover', (event) => {
    const hit = getCardIndex(event)
    if (!hit) {
      return
    }

    event.preventDefault()
    if (state.dropTarget.kind !== 'before' || state.dropTarget.index !== hit.index) {
      setDropTarget({ kind: 'before', index: hit.index })
    }
  })

  pageList.addEventListener('drop', (event) => {
    const hit = getCardIndex(event)
    if (!hit) {
      return
    }

    event.preventDefault()
    applyMove(hit.index)
  })

  endDropTarget.addEventListener('dragover', (event) => {
    event.preventDefault()
    setDropTarget({ kind: 'end' })
  })

  endDropTarget.addEventListener('drop', (event) => {
    event.preventDefault()
    applyMove(null)
  })

  document.addEventListener('keydown', (event) => {
    if (isEditableTarget(event.target)) {
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      clearSelection()
      resetDropTarget()
      return
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault()
      applyRemove()
    }
  }, { signal: listeners.signal })

  document.addEventListener('click', (event) => {
    if (event.composedPath().includes(pageList) || state.selectedIndices.size === 0) {
      return
    }

    clearSelection()
    resetDropTarget()
  }, { signal: listeners.signal })

  sync()

  return {
    updateLocale: syncLocale,
    destroy: () => {
      generation += 1
      listeners.abort()
      releaseDocuments()
    },
  }
}
