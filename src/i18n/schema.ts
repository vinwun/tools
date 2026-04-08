import type { CategoryId } from '../dashboard/categories'
import type { ToolId } from '../tools/catalog'

export type CategoryTranslation = {
  name: string
  description: string
}

export type ToolTranslation = {
  name: string
  description: string
}

export type Messages = {
  dashboard: {
    title: string
    subtitle: string
    categoriesAriaLabel: string
    languageLabel: string
  }
  navigation: {
    backToDashboard: string
    backToCategory: string
    breadcrumbAriaLabel: string
    toolsSegment: string
    availableTools: string
  }
  categories: Record<CategoryId, CategoryTranslation>
  tools: Record<ToolId, ToolTranslation>
}

