import type {JsonPrettyPrinterState} from './types.ts'

export const createInitialJsonPrettyPrinterState = (): JsonPrettyPrinterState => ({
  inputValue: '',
  indentSize: 2,
  formattedJson: '',
  parsedValue: null,
  status: 'empty',
  selectedFileName: null,
})

export const parseIndentValue = (value: string): number => {
  const parsed = Number(value)
  return parsed === 4 ? 4 : 2
}

export const formatJsonValue = (value: unknown, indentSize: number): string =>
  JSON.stringify(value, null, indentSize)

export const parseJsonOrJsonLines = (value: string): unknown => {
  try {
    return JSON.parse(value)
  } catch {
    const lines = value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)

    if (lines.length === 0) {
      throw new Error('Empty JSON input')
    }

    return lines.map((line) => JSON.parse(line))
  }
}
