import { renderCategoryPage } from '../categories/render.ts'
import { isCategoryId } from '../dashboard/category-data.ts'
import { LOCALE_SELECT_ID, renderDashboard } from '../dashboard/render.ts'
import { hasLocale, type Locale } from '../i18n'
import { initLocale, persistLocale, resolveInitialLocale } from '../i18n/manager.ts'
import { isToolIdForCategory } from '../tools/catalog.ts'
import { mountToolContent } from '../tools/registry.ts'
import { renderToolPage } from '../tools/render.ts'
import { navigateToRoute, resolveCurrentRoute, type Route } from './router.ts'

export const bootstrapApp = (): void => {
  const app = document.querySelector<HTMLDivElement>('#app')
  let currentLocale: Locale = resolveInitialLocale()

  const mount = () => {
    if (!app) return

    initLocale(currentLocale)
    const route = resolveCurrentRoute()
    app.innerHTML =
      route.type === 'dashboard'
        ? renderDashboard(currentLocale)
        : route.type === 'category'
          ? renderCategoryPage(currentLocale, route.categoryId)
          : renderToolPage(currentLocale, route.categoryId, route.toolId)

    bindLocaleSelector()

    if (route.type === 'tool') {
      mountToolContent(route.toolId, currentLocale)
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
      mount()
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

  bindNavigation()
  window.addEventListener('popstate', mount)
  mount()
}

