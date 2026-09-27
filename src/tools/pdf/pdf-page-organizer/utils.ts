export const PDF_THUMBNAIL_SCALE = 0.5

export type PdfThumbnailState = 'loading' | 'ready' | 'failed'

export type PdfPageEntry = {
  id: string
  file: File
  fileName: string
  pageNumber: number
  pageCount: number
  thumbnailState: PdfThumbnailState
  thumbnailUrl: string | null
}

export const buildSelectionRange = (anchorIndex: number, currentIndex: number): number[] => {
  const start = Math.min(anchorIndex, currentIndex)
  const end = Math.max(anchorIndex, currentIndex)
  const range: number[] = []

  for (let index = start; index <= end; index += 1) {
    range.push(index)
  }

  return range
}

export const keepSelectedEntries = (entries: readonly PdfPageEntry[], selectedIndices: ReadonlySet<number>): PdfPageEntry[] =>
  entries.filter((_, index) => selectedIndices.has(index))

export const removeSelectedEntries = (entries: readonly PdfPageEntry[], selectedIndices: ReadonlySet<number>): PdfPageEntry[] =>
  entries.filter((_, index) => !selectedIndices.has(index))

export const moveSelectedEntries = (
  entries: readonly PdfPageEntry[],
  selectedIndices: ReadonlySet<number>,
  targetIndex: number | null,
): PdfPageEntry[] => {
  if (selectedIndices.size === 0) {
    return [...entries]
  }

  const selectedEntries = entries.filter((_, index) => selectedIndices.has(index))
  const remainingEntries = entries.filter((_, index) => !selectedIndices.has(index))

  const insertionIndex = targetIndex === null
    ? remainingEntries.length
    : Math.max(0, Math.min(targetIndex, remainingEntries.length))

  return [
    ...remainingEntries.slice(0, insertionIndex),
    ...selectedEntries,
    ...remainingEntries.slice(insertionIndex),
  ]
}

// Every selected page moves one place on its own, so gaps between selected pages are kept; a page
// stops at the edge or behind a selected page that could not move.
export const shiftSelectedEntries = (
  entries: readonly PdfPageEntry[],
  selectedIndices: ReadonlySet<number>,
  offset: -1 | 1,
): { entries: PdfPageEntry[]; selectedIndices: number[] } => {
  const shifted = [...entries]
  const nextIndices = new Set<number>()
  const order = [...selectedIndices].sort((left, right) => (left - right) * -offset)
  for (const index of order) {
    const target = index + offset
    if (target < 0 || target >= shifted.length || nextIndices.has(target)) {
      nextIndices.add(index)
      continue
    }
    const moved = shifted[index]
    shifted[index] = shifted[target]
    shifted[target] = moved
    nextIndices.add(target)
  }
  return { entries: shifted, selectedIndices: [...nextIndices].sort((left, right) => left - right) }
}

// A selected page can move left when any unselected page lies before a selected one (right: after).
export const canShiftSelection = (entryCount: number, selectedIndices: ReadonlySet<number>, offset: -1 | 1): boolean => {
  const unselected = Array.from({ length: entryCount }, (_, index) => index).filter((index) => !selectedIndices.has(index))
  return selectedIndices.size > 0 && unselected.length > 0 && (offset < 0
    ? Math.min(...unselected) < Math.max(...selectedIndices)
    : Math.max(...unselected) > Math.min(...selectedIndices))
}

export const countSelectedEntries = (selectedIndices: ReadonlySet<number>): number => selectedIndices.size
