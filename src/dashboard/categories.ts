export const dashboardCategoryIds = [
  'image',
  'pdf',
  'audio',
  'rng',
  'time',
  'math',
  'text',
] as const

export type CategoryId = (typeof dashboardCategoryIds)[number]

export type DashboardCategory = {
  id: CategoryId
  color: string
}

export const dashboardCategories: DashboardCategory[] = [
  { id: 'image', color: '#2563eb' },
  { id: 'pdf', color: '#dc2626' },
  { id: 'audio', color: '#f5970b' },
  { id: 'rng', color: '#9333ea' },
  { id: 'time', color: '#ffdc00' },
  { id: 'math', color: '#16a34a' },
  { id: 'text', color: '#9b9b9b' },
]
