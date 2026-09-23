import { renderCategoryPage } from '../categories/render.ts'
import { isCategoryId } from '../dashboard/category-data.ts'
import { renderDashboard } from '../dashboard/render.ts'
import { LOCALE_SELECT_ID } from './render.ts'
import { hasLocale, type Locale } from '../i18n'
import { initLocale, persistLocale, resolveInitialLocale } from '../i18n/manager.ts'
import { isToolIdForCategory } from '../tools/catalog.ts'
import { mountToolContent, unmountToolContent, updateMountedToolLocale } from '../tools/registry.ts'
import { renderToolPage } from '../tools/render.ts'
import { navigateToRoute, resolveCurrentRoute, type Route } from './router.ts'

// Re-inserting the preserved tool resets every scroll position inside it (text fields, previews,
// lists), so they are read before the swap and written back afterwards.
const captureScrollPositions = (root: HTMLElement): (() => void) => {
  const positions = Array.from(root.querySelectorAll<HTMLElement>('*'))
    .filter((element) => element.scrollTop !== 0 || element.scrollLeft !== 0)
    .map((element) => ({ element, top: element.scrollTop, left: element.scrollLeft }))

  return () => {
    for (const { element, top, left } of positions) {
      element.scrollTop = top
      element.scrollLeft = left
    }
  }
}

export const bootstrapApp = (): void => {
  const app = document.querySelector<HTMLDivElement>('#app')
  let currentLocale: Locale = resolveInitialLocale()
  let currentRoute: Route = resolveCurrentRoute()

  const mount = (preserveToolContent = false): void => {
    if (!app) return

    // A locale switch keeps the mounted tool (and whatever the user entered) and only relabels it.
    const preservedToolContentRoot =
      preserveToolContent && currentRoute.type === 'tool'
        ? app.querySelector<HTMLElement>('[data-tool-content-root]')
        : null
    const restoreScrollPositions = preservedToolContentRoot && captureScrollPositions(preservedToolContentRoot)
    if (!preservedToolContentRoot) {
      unmountToolContent()
    }

    currentRoute = resolveCurrentRoute()
    initLocale(currentLocale)
    const route = currentRoute
    app.innerHTML =
      route.type === 'dashboard'
        ? renderDashboard(currentLocale)
        : route.type === 'category'
          ? renderCategoryPage(currentLocale, route.categoryId)
          : renderToolPage(currentLocale, route.categoryId, route.toolId)

    if (preservedToolContentRoot && restoreScrollPositions) {
      app.querySelector<HTMLElement>('[data-tool-content-root]')?.replaceWith(preservedToolContentRoot)
      // Restored before relabelling too, so a tool that rebuilds a scrolled element can carry its
      // position over; again a frame later, once re-rendered content has settled its size.
      restoreScrollPositions()
      updateMountedToolLocale(currentLocale)
      window.requestAnimationFrame(restoreScrollPositions)
    } else if (route.type === 'tool') {
      // Tools with lazily loaded dependencies mount once their chunk arrives.
      void mountToolContent(route.toolId, currentLocale)
    }

    bindLocaleSelector()
  }

  const goToRoute = (route: Route) => {
    navigateToRoute(route)
    mount()
  }

  const bindLocaleSelector = () => {
    const localeSelector = document.querySelector<HTMLSelectElement>(`#${LOCALE_SELECT_ID}`)
    if (!localeSelector) return

    localeSelector.addEventListener('change', (event) => {
      const selectedLocale = (event.target as HTMLSelectElement).value
      if (!hasLocale(selectedLocale)) return
      currentLocale = selectedLocale
      persistLocale(currentLocale)
      mount(true)
    })
  }

  const bindNavigation = () => {
    if (!app) return

    app.addEventListener('click', (event) => {
      const target = event.target as HTMLElement
      const categoryElement = target.closest<HTMLElement>('[data-category-link]')

      if (categoryElement) {
        event.preventDefault()
        const categoryId = categoryElement.dataset.categoryLink
        if (!categoryId || !isCategoryId(categoryId)) return
        goToRoute({ type: 'category', categoryId })
        return
      }

      const toolElement = target.closest<HTMLElement>('[data-tool-link]')

      if (toolElement) {
        event.preventDefault()
        const categoryId = toolElement.dataset.toolCategory
        const toolId = toolElement.dataset.toolLink
        if (!categoryId || !isCategoryId(categoryId) || !toolId || !isToolIdForCategory(categoryId, toolId)) return
        goToRoute({ type: 'tool', categoryId, toolId })
        return
      }

      const dashboardElement = target.closest<HTMLElement>('[data-dashboard-link]')
      if (!dashboardElement) return

      event.preventDefault()
      goToRoute({ type: 'dashboard' })
    })
  }

  const handlePopState = (): void => {
    mount()
  }

  bindNavigation()
  window.addEventListener('popstate', handlePopState)
  mount()
}
