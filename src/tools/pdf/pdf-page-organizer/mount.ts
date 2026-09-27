import { PDFDocument, type PDFPage } from 'pdf-lib'
import { getDocument, type PDFDocumentProxy } from 'pdfjs-dist'
import type { Messages } from '../../../i18n/schema.ts'
import type { MountTool } from '../../types.ts'
import { configurePdfWorker } from '../pdf-worker.ts'
import { canShiftSelection, keepSelectedEntries, moveSelectedEntries, removeSelectedEntries, shiftSelectedEntries, type PdfPageEntry, PDF_THUMBNAIL_SCALE, buildSelectionRange, countSelectedEntries } from './utils.ts'
import { createUniqueId, escapeHtml, formatMessage, queryRequired } from '../../foundations/dom.ts'
import { wireFilePicker } from '../../foundations/file-picker/mount.ts'
import { downloadBlob, formatAcceptList, stripExtension } from '../../foundations/files.ts'
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
  notice: 'uploadingStatus' | 'loadFailed' | 'exportFailed' | null
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

// Rendering every thumbnail at once freezes the tab on large PDFs.
const MAX_PARALLEL_THUMBNAILS = 3

const isEditableTarget = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.matches('input, textarea, select') || target.isContentEditable)

const hasFiles = (event: DragEvent): boolean => event.dataTransfer?.types.includes('Files') ?? false

const getCardIndex = (event: Event): { card: HTMLElement; index: number } | null => {
  const card = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>('[data-pdf-page-index]') : null
  const index = Number.parseInt(card?.dataset.pdfPageIndex ?? '', 10)
  return card && !Number.isNaN(index) ? { card, index } : null
}

const revokeThumbnails = (entries: readonly PdfPageEntry[]): void =>
  entries.forEach((entry) => entry.thumbnailUrl && URL.revokeObjectURL(entry.thumbnailUrl))

const renderThumbnailMarkup = (entry: PdfPageEntry, messages: Messages): string => {
  if (entry.thumbnailState === 'ready' && entry.thumbnailUrl) {
    return `<img src="${entry.thumbnailUrl}" alt="" class="pdf-page-organizer-page-thumbnail-image" />`
  }

  if (entry.thumbnailState === 'failed') {
    return `<div class="pdf-page-organizer-page-thumbnail-fallback pdf-page-organizer-page-thumbnail-fallback-failed">${escapeHtml(messages.pdfPageOrganizer.thumbnailFailed)}</div>`
  }

  return `<div class="pdf-page-organizer-page-thumbnail-fallback">${escapeHtml(messages.pdfPageOrganizer.thumbnailLoading)}</div>`
}

// Selection and drop target are applied by `syncCardStates`, so they never need a re-render.
const renderPageCard = (entry: PdfPageEntry, index: number, messages: Messages): string => {
  const entryLabel = formatMessage(messages.pdfPageOrganizer.pageEntryLabel, {
    fileName: entry.fileName,
    page: entry.pageNumber,
    pageCount: entry.pageCount,
  })

  return `
    <div
      class="tool-card pdf-page-organizer-page-card"
      data-pdf-page-index="${index}"
      data-pdf-page-id="${entry.id}"
      role="option"
      draggable="true"
      tabindex="0"
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

const syncCardStates = (elements: PdfPageOrganizerElements, state: PdfWorkspaceState): void => {
  Array.from(elements.pageList.children).forEach((card, index) => {
    const selected = state.selectedIndices.has(index)
    card.classList.toggle('is-selected', selected)
    card.classList.toggle('is-drop-target', state.dropTarget.kind === 'before' && state.dropTarget.index === index)
    card.setAttribute('aria-selected', String(selected))
  })
  elements.endDropTarget.classList.toggle('is-dragover', state.dropTarget.kind === 'end')
}

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
  syncCardStates(elements, state)
  elements.summary.classList.toggle('is-error', state.notice === 'loadFailed' || state.notice === 'exportFailed')
  elements.summary.textContent =
    state.notice
      ? pdfMessages[state.notice]
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

  elements.keepButton.disabled = state.isBusy || !hasSelection
  elements.removeButton.disabled = state.isBusy || !hasSelection
  elements.downloadButton.disabled = state.isBusy || !hasEntries
  elements.clearButton.disabled = state.isBusy || !hasEntries
  elements.moveLeftButton.disabled = state.isBusy || !canShiftSelection(state.entries.length, state.selectedIndices, -1)
  elements.moveRightButton.disabled = state.isBusy || !canShiftSelection(state.entries.length, state.selectedIndices, 1)
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
  const documentByFile = new Map<File, PDFDocumentProxy>()
  // Thumbnails are only rendered for cards in or near the visible part of the list.
  const nearbyEntryIds = new Set<string>()
  const renderingEntryIds = new Set<string>()
  let messages = initialMessages

  const state: PdfWorkspaceState = {
    entries: [],
    selectedIndices: new Set(),
    anchorIndex: null,
    isBusy: false,
    notice: null,
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
    renderWorkspace(root, elements, state, messages)
  }

  const releaseDocuments = (): void => {
    documentByFile.clear()
    loadedDocuments.splice(0).forEach((pdfDocument) => void pdfDocument.destroy())
  }

  const loadThumbnail = async (entry: PdfPageEntry): Promise<void> => {
    // Removed or cleared meanwhile: the result is dropped and the document may already be destroyed.
    const isStale = (): boolean => listeners.signal.aborted || !state.entries.includes(entry)
    try {
      const pdfDocument = documentByFile.get(entry.file)
      if (!pdfDocument) {
        return
      }

      const page = await pdfDocument.getPage(entry.pageNumber)
      const viewport = page.getViewport({ scale: PDF_THUMBNAIL_SCALE })
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')
      if (!context) {
        throw new Error('Canvas context unavailable')
      }

      canvas.width = Math.max(1, Math.floor(viewport.width))
      canvas.height = Math.max(1, Math.floor(viewport.height))
      await page.render({ canvas, canvasContext: context, viewport }).promise
      page.cleanup()
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve))
      if (isStale()) {
        return
      }

      entry.thumbnailState = blob ? 'ready' : 'failed'
      entry.thumbnailUrl = blob ? URL.createObjectURL(blob) : null
    } catch (error) {
      if (isStale()) {
        return
      }

      entry.thumbnailState = 'failed'
      console.error(error)
    }

    const thumbnail = pageList.querySelector(`[data-pdf-page-id="${entry.id}"] .pdf-page-organizer-page-thumbnail`)
    if (thumbnail) {
      thumbnail.innerHTML = renderThumbnailMarkup(entry, messages)
    }
  }

  const pumpThumbnails = (): void => {
    for (const entryId of nearbyEntryIds) {
      if (renderingEntryIds.size >= MAX_PARALLEL_THUMBNAILS) {
        return
      }

      nearbyEntryIds.delete(entryId)
      const entry = state.entries.find((candidate) => candidate.id === entryId)
      if (!entry || entry.thumbnailState !== 'loading' || renderingEntryIds.has(entryId)) {
        continue
      }

      renderingEntryIds.add(entryId)
      void loadThumbnail(entry).finally(() => {
        renderingEntryIds.delete(entryId)
        pumpThumbnails()
      })
    }
  }

  // The margin of one list width on each side preloads neighbors before they scroll into view.
  const thumbnailObserver = new IntersectionObserver((changes) => {
    changes.forEach(({ target, isIntersecting }) => {
      const entryId = (target as HTMLElement).dataset.pdfPageId ?? ''
      if (isIntersecting) {
        nearbyEntryIds.add(entryId)
      } else {
        nearbyEntryIds.delete(entryId)
      }
    })
    pumpThumbnails()
  }, { root: listShell, rootMargin: '0px 100%' })

  // Only needed when entries change; selection and drop target updates go through `sync`.
  const renderList = (): void => {
    const scroll = { left: listShell.scrollLeft, top: listShell.scrollTop }
    const cards = (): HTMLElement[] => Array.from(pageList.children) as HTMLElement[]
    const focusedIndex = cards().indexOf(document.activeElement as HTMLElement)
    thumbnailObserver.disconnect()
    nearbyEntryIds.clear()
    pageList.innerHTML = state.entries.map((entry, index) => renderPageCard(entry, index, messages)).join('')
    cards().forEach((card) => thumbnailObserver.observe(card))
    sync()
    restoreListScroll(scroll)
    if (focusedIndex >= 0) {
      cards()[Math.min(focusedIndex, cards().length - 1)]?.focus({ preventScroll: true })
    }
  }

  const syncLocale = (nextMessages: Messages): void => {
    messages = nextMessages
    syncStaticTexts(elements, filePicker.browseButton, messages)
    renderList()
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
    syncCardStates(elements, state)
  }

  const resetDropTarget = (): void => {
    setDropTarget({ kind: 'none' })
  }

  const handlePageListWheel = (event: WheelEvent): void => {
    const horizontalScroll = event.deltaX !== 0 ? event.deltaX : event.deltaY
    // At either end the wheel scrolls the page again instead of being swallowed.
    const canScroll = horizontalScroll < 0
      ? listShell.scrollLeft > 0
      : horizontalScroll > 0 && listShell.scrollLeft < listShell.scrollWidth - listShell.clientWidth - 1
    if (!canScroll) {
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
    revokeThumbnails(state.entries.filter((entry) => !entries.includes(entry)))
    state.entries = entries
    state.notice = null
    state.dropTarget = { kind: 'none' }
    clearSelection()
    renderList()
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
  const applyMoveBy = (offset: -1 | 1): void => {
    if (!canShiftSelection(state.entries.length, state.selectedIndices, offset)) {
      return
    }

    const shifted = shiftSelectedEntries(state.entries, state.selectedIndices, offset)
    state.entries = shifted.entries
    setSelection(state, shifted.selectedIndices, shifted.selectedIndices[0])
    state.dropTarget = { kind: 'none' }
    renderList()
  }

  const exportPdf = async (): Promise<void> => {
    const { entries } = state
    if (entries.length === 0 || state.isBusy) {
      return
    }

    setBusy(true)
    state.notice = null
    sync()
    try {
      const pageIndicesByFile = new Map<File, number[]>()
      entries.forEach((entry) => {
        pageIndicesByFile.set(entry.file, [...(pageIndicesByFile.get(entry.file) ?? []), entry.pageNumber - 1])
      })

      // One copy per source document, so resources its pages share (fonts, images) are copied once.
      const exportDocument = await PDFDocument.create()
      const copiedPagesByFile = new Map<File, PDFPage[]>()
      for (const [file, pageIndices] of pageIndicesByFile) {
        const sourceDocument = await PDFDocument.load(await file.arrayBuffer())
        copiedPagesByFile.set(file, await exportDocument.copyPages(sourceDocument, pageIndices))
      }
      entries.forEach((entry) => exportDocument.addPage(copiedPagesByFile.get(entry.file)!.shift()!))

      const pdfBytes = await exportDocument.save()
      const pdfArrayBuffer = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength) as ArrayBuffer
      const blob = new Blob([pdfArrayBuffer], { type: 'application/pdf' })
      downloadBlob(blob, `${stripExtension(entries[0].fileName)}-organized.pdf`)
    } catch (error) {
      state.notice = 'exportFailed'
      console.error(error)
    }

    setBusy(false)
    sync()
  }

  const appendFiles = async (files: readonly File[]): Promise<void> => {
    const pdfFiles = files.filter(isPdfFile)
    if (pdfFiles.length === 0 || state.isBusy) {
      return
    }

    setBusy(true)
    state.notice = 'uploadingStatus'
    sync()
    let hasFailed = false

    for (const file of pdfFiles) {
      try {
        const bytes = new Uint8Array(await file.arrayBuffer())
        const pdfDocument = await getDocument({ data: bytes }).promise
        if (listeners.signal.aborted) {
          void pdfDocument.destroy()
          return
        }

        loadedDocuments.push(pdfDocument)
        documentByFile.set(file, pdfDocument)
        const pageCount = pdfDocument.numPages

        for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
          state.entries.push({
            id: createUniqueId(),
            file,
            fileName: file.name,
            pageNumber,
            pageCount,
            thumbnailState: 'loading',
            thumbnailUrl: null,
          })
        }
        renderList()
      } catch (error) {
        hasFailed = true
        console.error(error)
      }
    }

    setBusy(false)
    state.notice = hasFailed ? 'loadFailed' : null
    state.dropTarget = { kind: 'none' }
    sync()
  }

  elements.clearButton.addEventListener('click', () => {
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
      sync()
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

  const isOverEndTarget = (event: Event): boolean => event.target instanceof Node && endDropTarget.contains(event.target)

  // Files dropped anywhere on the list are added (and never opened by the browser), not treated as a move.
  listShell.addEventListener('dragover', (event) => {
    if (hasFiles(event)) {
      event.preventDefault()
      return
    }

    const hit = getCardIndex(event)
    if (isOverEndTarget(event)) {
      event.preventDefault()
      setDropTarget({ kind: 'end' })
    } else if (hit) {
      event.preventDefault()
      if (state.dropTarget.kind !== 'before' || state.dropTarget.index !== hit.index) {
        setDropTarget({ kind: 'before', index: hit.index })
      }
    }
  })

  listShell.addEventListener('drop', (event) => {
    event.preventDefault()
    const files = event.dataTransfer?.files
    const hit = getCardIndex(event)
    if (state.isBusy) {
      resetDropTarget()
    } else if (files && files.length > 0) {
      void appendFiles([...files])
    } else if (hit || isOverEndTarget(event)) {
      applyMove(hit ? hit.index : null)
    }
  })

  document.addEventListener('keydown', (event) => {
    if (isEditableTarget(event.target)) {
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      clearSelection()
      state.dropTarget = { kind: 'none' }
      sync()
      return
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault()
      applyRemove()
    }
  }, { signal: listeners.signal })

  // The move buttons act on the selection, so clicking them must not count as clicking outside.
  const selectionTargets: EventTarget[] = [pageList, elements.moveLeftButton, elements.moveRightButton]
  document.addEventListener('click', (event) => {
    const path = event.composedPath()
    if (selectionTargets.some((target) => path.includes(target)) || state.selectedIndices.size === 0) {
      return
    }

    clearSelection()
    state.dropTarget = { kind: 'none' }
    sync()
  }, { signal: listeners.signal })

  sync()

  return {
    updateLocale: syncLocale,
    destroy: () => {
      listeners.abort()
      thumbnailObserver.disconnect()
      revokeThumbnails(state.entries)
      releaseDocuments()
    },
  }
}
