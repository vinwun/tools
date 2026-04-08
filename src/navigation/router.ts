import { isCategoryId, type CategoryId } from '../dashboard/categories'
import { isToolIdForCategory, type ToolId } from '../tools/catalog'

const BASE_URL = import.meta.env.BASE_URL || '/'

const ensureLeadingSlash = (value: string): string =>
  value.startsWith('/') ? value : `/${value}`

const ensureTrailingSlash = (value: string): string =>
  value.endsWith('/') ? value : `${value}/`

const normalizePath = (value: string): string =>
  ensureTrailingSlash(ensureLeadingSlash(value.trim()))

const BASE_PATH = normalizePath(BASE_URL)

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

export const buildToolPath = (categoryId: CategoryId, toolId: ToolId): string =>
  `${BASE_PATH}${categoryId}/${toolId}/`

export const buildDashboardPath = (): string => BASE_PATH

export const getRoutePath = (route: Route): string =>
  route.type === 'dashboard'
    ? buildDashboardPath()
    : route.type === 'category'
      ? buildCategoryPath(route.categoryId)
      : buildToolPath(route.categoryId, route.toolId)

const routeFromSegments = (segments: string[]): Route => {
  if (segments.length === 0) {
    return { type: 'dashboard' }
  }

  if (segments.length === 1) {
    if (segments[0].toLowerCase() === 'tools') {
      return { type: 'dashboard' }
    }

    if (isCategoryId(segments[0])) {
      return { type: 'category', categoryId: segments[0] }
    }

    return { type: 'dashboard' }
  }

  if (segments.length === 2 && isCategoryId(segments[0])) {
    if (isToolIdForCategory(segments[0], segments[1])) {
      return { type: 'tool', categoryId: segments[0], toolId: segments[1] }
    }

    return { type: 'dashboard' }
  }

  if (segments[0].toLowerCase() === 'tools' && segments.length === 2 && isCategoryId(segments[1])) {
    return { type: 'category', categoryId: segments[1] }
  }

  if (
    segments[0].toLowerCase() === 'tools' &&
    segments.length === 3 &&
    isCategoryId(segments[1]) &&
    isToolIdForCategory(segments[1], segments[2])
  ) {
    return { type: 'tool', categoryId: segments[1], toolId: segments[2] }
  }

  return { type: 'dashboard' }
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



