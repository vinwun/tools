import type { CategoryId } from '../dashboard/category-data.ts'

export const toolsByCategory = {
  image: ['imageConverter', 'colorPicker'],
  pdf: ['pdfMergeReorderSplit', 'pdfTextExtractor'],
  audio: ['audioConverter', 'audioTrimmer'],
  rng: ['numberGenerator', 'stringGenerator'],
  time: ['stopwatch', 'timer', 'timezoneConverter'],
  math: ['primeFactorizer', 'numericalConverter', 'aspectRatioCalculator', 'floatingPointInspector', 'matrixMultiplier'],
  text: ['jsonPrettyPrinter', 'markdownDisplayer', 'textCounter', 'loremIpsumGenerator', 'unicodeDisplayer'],
} as const satisfies Record<CategoryId, readonly string[]>

type ToolMap = typeof toolsByCategory

export type ToolId = ToolMap[CategoryId][number]

export const getToolsForCategory = (categoryId: CategoryId): readonly ToolId[] =>
  toolsByCategory[categoryId]

export const isToolIdForCategory = (
  categoryId: CategoryId,
  value: string,
): value is ToolId => {
  const tools = toolsByCategory[categoryId] as readonly string[]
  return tools.includes(value)
}
