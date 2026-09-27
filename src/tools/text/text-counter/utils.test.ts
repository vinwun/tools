import { describe, expect, it } from 'vitest'
import { countText } from './utils.ts'

describe('countText', () => {
  it('counts an emoji with skin tone as one character', () => {
    expect(countText('👍🏽').characters).toBe(1)
  })

  it('counts umlauts and ß as letters', () => {
    const counts = countText('Grüße 42')
    expect(counts.letters).toBe(5)
    expect(counts.digits).toBe(2)
    expect(counts.words).toBe(2)
  })

  it('counts sentences ending in quotes, brackets or an ellipsis', () => {
    expect(countText('„Hallo.“ Dann (ging er.) Warte… ok.').sentences).toBe(4)
  })
})
