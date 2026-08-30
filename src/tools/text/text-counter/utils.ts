import type { TextCounterState, TextCounterStatKey } from './types.ts'

export const TEXT_COUNTER_STAT_KEYS = [
  'characters',
  'words',
  'lines',
  'paragraphs',
  'sentences',
  'punctuation',
  'alphanumeric',
  'letters',
  'digits',
  'numbers',
  'whitespace',
  'symbols',
] as const satisfies readonly TextCounterStatKey[]

export const createInitialTextCounterState = (): TextCounterState => ({
  inputValue: '',
})

export type TextCounts = Record<TextCounterStatKey, number>

export const countText = (text: string): TextCounts => {
  const characters = text.length
  const words = text.split(/\s+/).filter((word) => word.length > 0).length
  const lines = text.length === 0 ? 0 : text.split(/\r?\n/).length
  const paragraphs =
    text.trim().length === 0
      ? 0
      : text.split(/\r?\n\s*\r?\n/).filter((paragraph) => paragraph.trim().length > 0).length
  const sentences = (text.match(/[.!?]+(?=\s|$)/g) ?? []).length
  const punctuation = (text.match(/[!"#$%&'()*+,\-./:;<=>?@[\]\\^_`{|}~]/g) ?? []).length
  const letters = (text.match(/[A-Za-z]/g) ?? []).length
  const digits = (text.match(/\d/g) ?? []).length
  const alphanumeric = letters + digits
  const numbers = (text.match(/\d+(?:[.,]\d+)*/g) ?? []).length
  const whitespace = (text.match(/\s/g) ?? []).length
  const symbols = Math.max(0, characters - letters - digits - whitespace - punctuation)

  return {
    characters,
    words,
    lines,
    paragraphs,
    sentences,
    punctuation,
    alphanumeric,
    letters,
    digits,
    numbers,
    whitespace,
    symbols,
  }
}
