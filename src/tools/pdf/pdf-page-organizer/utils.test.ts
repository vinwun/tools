import { describe, expect, it } from 'vitest'
import { canShiftSelection, shiftSelectedEntries, type PdfPageEntry } from './utils.ts'

const entries = ['1', '2', '3', '4', '5'].map((id) => ({ id }) as PdfPageEntry)
const shift = (selected: number[], offset: -1 | 1) => {
  const result = shiftSelectedEntries(entries, new Set(selected), offset)
  return [result.entries.map((entry) => entry.id).join(''), result.selectedIndices]
}

describe('shiftSelectedEntries', () => {
  it('moves every selected page one place and keeps the gaps', () => {
    expect(shift([0, 2], 1)).toEqual(['21435', [1, 3]])
  })

  it('stops a page at the edge while the others still move', () => {
    expect(shift([0, 2], -1)).toEqual(['13245', [0, 1]])
  })

  it('reports when nothing can move', () => {
    expect(canShiftSelection(5, new Set([3, 4]), 1)).toBe(false)
    expect(canShiftSelection(5, new Set([3, 4]), -1)).toBe(true)
  })
})
