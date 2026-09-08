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
  thumbnailError: string | null
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

export const countSelectedEntries = (selectedIndices: ReadonlySet<number>): number => selectedIndices.size
