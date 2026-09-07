import type { CategoryId } from '../dashboard/category-data.ts'

export const toolsByCategory = {
  image: ['imageConverter', 'colorPicker'],
  pdf: ['pdfPageOrganizer', 'pdfTextExtractor'],
  audio: ['audioConverter', 'audioCutter'],
  video: ['videoAudioSplitter', 'videoCutter'],
  rng: ['numberGenerator', 'stringGenerator'],
  time: ['stopwatch', 'timer', 'timezoneConverter'],
  math: ['primeFactorizer', 'baseConverter', 'aspectRatioCalculator', 'floatingPointConverter', 'matrixMultiplier'],
  text: ['jsonPrettyPrinter', 'markdownViewer', 'textCounter', 'loremIpsumGenerator', 'unicodeConverter', 'hiddenCharactersInspector'],
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
