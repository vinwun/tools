import { renderCategoryPage } from '../categories/render.ts'
import { isCategoryId } from '../dashboard/category-data.ts'
import { LOCALE_SELECT_ID, renderDashboard } from '../dashboard/render.ts'
import { hasLocale, type Locale } from '../i18n'
import { initLocale, persistLocale, resolveInitialLocale } from '../i18n/manager.ts'
import { isToolIdForCategory } from '../tools/catalog.ts'
import { hasMountedToolContent, mountToolContent, updateMountedToolLocale } from '../tools/registry.ts'
import { renderToolPage } from '../tools/render.ts'
import { navigateToRoute, resolveCurrentRoute, type Route } from './router.ts'

export const bootstrapApp = (): void => {
  const app = document.querySelector<HTMLDivElement>('#app')
  let currentLocale: Locale = resolveInitialLocale()
  let currentRoute: Route = resolveCurrentRoute()

  const mount = (preserveMountedToolContent = false): void => {
    if (!app) return

    const scrollRestorationTarget =
      preserveMountedToolContent && currentRoute.type === 'tool'
        ? app.querySelector<HTMLElement>('.pdf-tools-list-shell')
        : null
    const savedScrollLeft = scrollRestorationTarget?.scrollLeft ?? 0
    const savedScrollTop = scrollRestorationTarget?.scrollTop ?? 0

    const preservedToolContentRoot =
      preserveMountedToolContent && currentRoute.type === 'tool' && hasMountedToolContent(currentRoute.toolId)
        ? app.querySelector<HTMLElement>('[data-tool-content-root]')
        : null

    currentRoute = resolveCurrentRoute()
    initLocale(currentLocale)
    const route = currentRoute
    app.innerHTML =
      route.type === 'dashboard'
        ? renderDashboard(currentLocale)
        : route.type === 'category'
          ? renderCategoryPage(currentLocale, route.categoryId)
          : renderToolPage(currentLocale, route.categoryId, route.toolId)

    if (preservedToolContentRoot) {
      const toolContentRoot = app.querySelector<HTMLElement>('[data-tool-content-root]')
      if (toolContentRoot) {
        toolContentRoot.replaceWith(preservedToolContentRoot)
      }
    }

    if (route.type === 'tool' && preservedToolContentRoot) {
      updateMountedToolLocale(route.toolId, currentLocale)
    }

    bindLocaleSelector()

    if (route.type === 'tool' && !preservedToolContentRoot) {
      mountToolContent(route.toolId, currentLocale)
    }

    if (scrollRestorationTarget) {
      const restoredScrollTarget = app.querySelector<HTMLElement>('.pdf-tools-list-shell')
      if (restoredScrollTarget) {
        const restoreScroll = (): void => {
          restoredScrollTarget.scrollLeft = savedScrollLeft
          restoredScrollTarget.scrollTop = savedScrollTop
        }

        restoreScroll()
        window.requestAnimationFrame(restoreScroll)
        window.setTimeout(restoreScroll, 0)
      }
    }
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
