import type { Messages } from '../../../i18n/schema.ts'
import { parseDecimalNumber } from '../../foundations/numbers.ts'
import type { StringGeneratorEntry, StringGeneratorState } from './types.ts'

const DEFAULT_STRING_ENTRIES = ['Alpha', 'Beta', 'Gamma'] as const

const DEFAULT_RESULT_TEXT = '—'

const hasCryptoRandomValues = (): boolean =>
  typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function'

const parseWeight = (value: string): number | null => {
  const parsedValue = parseDecimalNumber(value)
  return parsedValue !== null && parsedValue > 0 ? parsedValue : null
}

const randomUnitValue = (): number => {
  if (!hasCryptoRandomValues()) {
    return Math.random()
  }

  const randomBuffer = new Uint32Array(1)
  crypto.getRandomValues(randomBuffer)
  return randomBuffer[0] / 0x100000000
}

export const createInitialStringGeneratorState = (): StringGeneratorState => ({
  entriesText: DEFAULT_STRING_ENTRIES.join('\n'),
  uniqueMode: false,
  availableEntryIndices: [],
  resultText: DEFAULT_RESULT_TEXT,
})

export const parseStringGeneratorEntries = (value: string): StringGeneratorEntry[] =>
  value
    .split(/\r?\n/)
    .map((line) => {
      const trimmedLine = line.trim()
      if (trimmedLine.length === 0) {
        return null
      }

      const separatorIndex = trimmedLine.lastIndexOf('|')
      if (separatorIndex <= 0 || separatorIndex === trimmedLine.length - 1) {
        return { value: trimmedLine, weight: 1 }
      }

      const entryValue = trimmedLine.slice(0, separatorIndex).trim()
      if (entryValue.length === 0) {
        return null
      }

      const parsedWeight = parseWeight(trimmedLine.slice(separatorIndex + 1))
      return {
        value: entryValue,
        weight: parsedWeight ?? 1,
      }
    })
    .filter((entry): entry is StringGeneratorEntry => entry !== null)

export const createUniqueEntryPool = (entries: readonly StringGeneratorEntry[]): number[] =>
  entries.map((_, index) => index)

export const pickWeightedEntryIndex = (
  entries: readonly StringGeneratorEntry[],
  candidateIndices: readonly number[],
): number | null => {
  if (candidateIndices.length === 0) {
    return null
  }

  const totalWeight = candidateIndices.reduce((sum, index) => sum + (entries[index]?.weight ?? 0), 0)
  if (totalWeight <= 0) {
    return candidateIndices[0] ?? null
  }

  let remainingWeight = randomUnitValue() * totalWeight

  for (const index of candidateIndices) {
    remainingWeight -= entries[index]?.weight ?? 0
    if (remainingWeight < 0) {
      return index
    }
  }

  return candidateIndices[candidateIndices.length - 1] ?? null
}

export const formatStringGeneratorStatus = (
  messages: Messages,
  entriesCount: number,
  uniqueMode: boolean,
  remainingCount: number,
): string => {
  const stringMessages = messages.rngStringGenerator

  if (entriesCount === 0) {
    return stringMessages.emptyStateMessage
  }

  if (uniqueMode) {
    return remainingCount === 0
      ? stringMessages.exhaustedMessage
      : stringMessages.uniqueStatusMessage.replace('{count}', String(remainingCount))
  }

  return stringMessages.readyMessage.replace('{count}', String(entriesCount))
}

export { escapeHtml } from '../../foundations/dom.ts'
