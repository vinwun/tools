import { describe, expect, it } from 'vitest'
import { parseStringGeneratorEntries } from './utils.ts'

describe('parseStringGeneratorEntries', () => {
  it('reads weights after the last "|"', () => {
    expect(parseStringGeneratorEntries('Rock | 3\nPaper')).toEqual([
      { value: 'Rock', weight: 3 },
      { value: 'Paper', weight: 1 },
    ])
  })

  it('keeps the whole line when the part after "|" is no weight', () => {
    expect(parseStringGeneratorEntries('Rock|Paper')).toEqual([{ value: 'Rock|Paper', weight: 1 }])
  })

  it('excludes entries with weight 0', () => {
    expect(parseStringGeneratorEntries('A|0\nB')).toEqual([{ value: 'B', weight: 1 }])
  })
})
