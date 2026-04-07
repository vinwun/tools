import type { CategoryId } from '../dashboard/categories'

export type CategoryTranslation = {
  name: string
  description: string
  tools: string[]
}

export type Messages = {
  dashboard: {
    title: string
    subtitle: string
    categoriesAriaLabel: string
    languageLabel: string
  }
  categories: Record<CategoryId, CategoryTranslation>
}

