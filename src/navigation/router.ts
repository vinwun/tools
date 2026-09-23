import { isCategoryId, type CategoryId } from '../dashboard/category-data.ts'
import { getToolsForCategory, type ToolId } from '../tools/catalog'

const ensureLeadingSlash = (value: string): string =>
  value.startsWith('/') ? value : `/${value}`

const ensureTrailingSlash = (value: string): string =>
  value.endsWith('/') ? value : `${value}/`

const normalizePath = (value: string): string =>
  ensureTrailingSlash(ensureLeadingSlash(value.trim()))

const BASE_PATH = normalizePath(import.meta.env.BASE_URL)

export type Route =
  | { type: 'dashboard' }
  | { type: 'category'; categoryId: CategoryId }
  | { type: 'tool'; categoryId: CategoryId; toolId: ToolId }

const toSegments = (pathname: string): string[] =>
  pathname
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)

export const buildCategoryPath = (categoryId: CategoryId): string =>
  `${BASE_PATH}${categoryId}/`

// URLs use kebab-case slugs while `ToolId` keys stay camelCase across catalog, schema and locales.
const buildToolSlug = (toolId: ToolId): string =>
  toolId.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()

const toolIdFromSlug = (categoryId: CategoryId, slug: string): ToolId | undefined =>
  getToolsForCategory(categoryId).find((toolId) => buildToolSlug(toolId) === slug)

export const buildToolPath = (categoryId: CategoryId, toolId: ToolId): string =>
  `${BASE_PATH}${categoryId}/${buildToolSlug(toolId)}/`

export const buildDashboardPath = (): string => BASE_PATH

export const getRoutePath = (route: Route): string =>
  route.type === 'dashboard'
    ? buildDashboardPath()
    : route.type === 'category'
      ? buildCategoryPath(route.categoryId)
      : buildToolPath(route.categoryId, route.toolId)

const routeFromSegments = (segments: string[]): Route => {
  const [categorySegment, toolSegment, ...rest] = segments
  if (!categorySegment || !isCategoryId(categorySegment) || rest.length > 0) {
    return { type: 'dashboard' }
  }

  if (toolSegment === undefined) {
    return { type: 'category', categoryId: categorySegment }
  }

  const toolId = toolIdFromSlug(categorySegment, toolSegment)
  return toolId ? { type: 'tool', categoryId: categorySegment, toolId } : { type: 'dashboard' }
}

export const parseRoute = (pathname: string): Route => {
  const normalizedPathname = normalizePath(pathname)

  // First try route resolution relative to Vite base path.
  if (normalizedPathname.startsWith(BASE_PATH)) {
    const pathWithinBase = normalizedPathname.slice(BASE_PATH.length)
    const baseRelativeRoute = routeFromSegments(toSegments(pathWithinBase))
    if (baseRelativeRoute.type !== 'dashboard' || pathWithinBase.length === 0) {
      return baseRelativeRoute
    }
  }

  // Fallback for environments that are served without the configured base path.
  return routeFromSegments(toSegments(normalizedPathname))
}

export const resolveCurrentRoute = (): Route => parseRoute(window.location.pathname)

export const navigateToRoute = (route: Route): void => {
  const targetPath = normalizePath(getRoutePath(route))
  const currentPath = normalizePath(window.location.pathname)

  if (currentPath === targetPath) {
    return
  }

  window.history.pushState({}, '', targetPath)
}
