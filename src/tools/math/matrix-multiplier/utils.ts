import type { Messages } from '../../../i18n/schema.ts'
import type { MatrixMultiplierState } from './types.ts'

const DEFAULT_MATRIX_A = '1 2\n3 4'
const DEFAULT_MATRIX_B = '5 6\n7 8'
const MAX_DECIMAL_PLACES = 6
export const DEFAULT_OUTPUT_TEXT = '—'
const DIMENSION_PLACEHOLDER = '—'

export type MatrixMultiplierStatusKey = 'empty' | 'invalid' | 'mismatch' | 'ready'

type MatrixDimensions = {
  rows: number
  cols: number
}

type ParsedMatrix = {
  matrix: number[][]
  rows: number
  cols: number
}

type ParsedMatrixResult =
  | { ok: true; value: ParsedMatrix }
  | { ok: false; reason: 'empty' | 'invalid' }

const parseMatrixInput = (value: string): ParsedMatrixResult => {
  const rows = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (rows.length === 0) {
    return { ok: false, reason: 'empty' }
  }

  const parseNumberPart = (part: string): number => {
    const trimmed = part.trim()
    const commaCount = (trimmed.match(/,/g) ?? []).length
    if (commaCount > 1) {
      return Number.NaN
    }
    if (trimmed.includes('.') && trimmed.includes(',')) {
      return Number.NaN
    }
    const normalized = commaCount === 1 ? trimmed.replace(',', '.') : trimmed
    return Number(normalized)
  }

  const matrix: number[][] = []
  let columns = 0

  for (const row of rows) {
    const parts = row.split(/\s+/).filter(Boolean)
    if (parts.length === 0) {
      return { ok: false, reason: 'invalid' }
    }

    const numbers = parts.map((part) => parseNumberPart(part))
    if (numbers.some((value) => !Number.isFinite(value))) {
      return { ok: false, reason: 'invalid' }
    }

    if (columns === 0) {
      columns = numbers.length
    }

    if (numbers.length !== columns) {
      return { ok: false, reason: 'invalid' }
    }

    matrix.push(numbers)
  }

  return {
    ok: true,
    value: {
      matrix,
      rows: matrix.length,
      cols: columns,
    },
  }
}

const multiplyMatrices = (left: number[][], right: number[][]): number[][] => {
  const rows = left.length
  const columns = right[0]?.length ?? 0
  const shared = right.length
  const result = Array.from({ length: rows }, () => Array.from({ length: columns }, () => 0))

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      let sum = 0
      for (let index = 0; index < shared; index += 1) {
        sum += left[row][index] * right[index][column]
      }
      result[row][column] = sum
    }
  }

  return result
}

export const resolveNumberLocale = (): string => document.documentElement.lang || 'en'

const formatNumber = (value: number, locale: string): string => {
  const normalized = Object.is(value, -0) ? 0 : value
  if (Number.isInteger(normalized)) {
    return String(normalized)
  }

  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: MAX_DECIMAL_PLACES,
    minimumFractionDigits: 0,
    useGrouping: false,
  }).format(normalized)
}

const formatMatrix = (matrix: number[][], locale: string): string =>
  matrix.map((row) => row.map((value) => formatNumber(value, locale)).join('\t')).join('\n')

const formatDimensionsText = (messages: Messages, dimensions: MatrixDimensions | null): string => {
  const { matrixMultiplier } = messages
  if (!dimensions) {
    return matrixMultiplier.dimensionPlaceholder
  }

  return matrixMultiplier.dimensionText
    .replace('{rows}', dimensions.rows.toString())
    .replace('{cols}', dimensions.cols.toString())
}

const resolveStatusText = (
  messages: Messages,
  statusKey: MatrixMultiplierStatusKey,
  resultDimensions: MatrixDimensions | null,
): string => {
  const { matrixMultiplier } = messages
  const lookup: Record<MatrixMultiplierStatusKey, string> = {
    empty: matrixMultiplier.statusEmpty,
    invalid: matrixMultiplier.statusInvalid,
    mismatch: matrixMultiplier.statusMismatch,
    ready: matrixMultiplier.statusReady,
  }

  if (statusKey !== 'ready') {
    return lookup[statusKey]
  }

  return lookup.ready
    .replace('{rRows}', resultDimensions?.rows.toString() ?? DIMENSION_PLACEHOLDER)
    .replace('{rCols}', resultDimensions?.cols.toString() ?? DIMENSION_PLACEHOLDER)
}

export const calculateMatrixMultiplierState = (
  matrixAValue: string,
  matrixBValue: string,
  messages: Messages,
  locale: string = resolveNumberLocale(),
): Pick<MatrixMultiplierState, 'outputText' | 'statusText' | 'matrixADimensionsText' | 'matrixBDimensionsText'> => {
  const parsedA = parseMatrixInput(matrixAValue)
  const parsedB = parseMatrixInput(matrixBValue)

  const dimensionsA = parsedA.ok ? { rows: parsedA.value.rows, cols: parsedA.value.cols } : null
  const dimensionsB = parsedB.ok ? { rows: parsedB.value.rows, cols: parsedB.value.cols } : null

  const isEmpty =
    (!parsedA.ok && parsedA.reason === 'empty') || (!parsedB.ok && parsedB.reason === 'empty')
  const isInvalid =
    (!parsedA.ok && parsedA.reason === 'invalid') || (!parsedB.ok && parsedB.reason === 'invalid')

  let statusKey: MatrixMultiplierStatusKey = 'ready'
  let outputText = DEFAULT_OUTPUT_TEXT
  let resultDimensions: MatrixDimensions | null = null

  if (isEmpty) {
    statusKey = 'empty'
  } else if (isInvalid) {
    statusKey = 'invalid'
  } else if (parsedA.ok && parsedB.ok && parsedA.value.cols !== parsedB.value.rows) {
    statusKey = 'mismatch'
  } else if (parsedA.ok && parsedB.ok) {
    const multiplied = multiplyMatrices(parsedA.value.matrix, parsedB.value.matrix)
    resultDimensions = { rows: multiplied.length, cols: multiplied[0]?.length ?? 0 }
    outputText = formatMatrix(multiplied, locale)
  }

  return {
    outputText,
    statusText: resolveStatusText(messages, statusKey, resultDimensions),
    matrixADimensionsText: formatDimensionsText(messages, dimensionsA),
    matrixBDimensionsText: formatDimensionsText(messages, dimensionsB),
  }
}

export const createInitialMatrixMultiplierState = (
  messages: Messages,
  locale: string = resolveNumberLocale(),
): MatrixMultiplierState => {
  const computed = calculateMatrixMultiplierState(DEFAULT_MATRIX_A, DEFAULT_MATRIX_B, messages, locale)

  return {
    matrixAValue: DEFAULT_MATRIX_A,
    matrixBValue: DEFAULT_MATRIX_B,
    outputText: computed.outputText,
    statusText: computed.statusText,
    matrixADimensionsText: computed.matrixADimensionsText,
    matrixBDimensionsText: computed.matrixBDimensionsText,
  }
}
