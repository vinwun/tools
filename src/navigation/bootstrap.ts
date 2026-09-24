import { renderCategoryPage } from '../categories/render.ts'
import { isCategoryId } from '../dashboard/category-data.ts'
import { renderDashboard } from '../dashboard/render.ts'
import { LOCALE_SELECT_ID } from './render.ts'
import { hasLocale, messagesByLocale, type Locale } from '../i18n'
import { persistLocale, resolveInitialLocale } from '../i18n/manager.ts'
import { isToolIdForCategory } from '../tools/catalog.ts'
import { mountToolContent, unmountToolContent, updateMountedToolLocale } from '../tools/registry.ts'
import { renderToolPage } from '../tools/render.ts'
import { navigateToRoute, resolveCurrentRoute, type Route } from './router.ts'

const SITE_TITLE = 'Tools'

// Swaps the page chrome around the tool but never detaches the tool itself: re-inserting it would
// reset every scroll position inside and force a full re-layout, which stalls on large content.
const replacePageAroundTool = (toolContentRoot: HTMLElement, pageHtml: string): void => {
  const template = document.createElement('template')
  template.innerHTML = pageHtml
  const currentChildren = Array.from(toolContentRoot.parentElement?.children ?? [])
  Array.from(template.content.firstElementChild?.children ?? []).forEach((child, index) => {
    if (currentChildren[index] !== toolContentRoot) currentChildren[index]?.replaceWith(child)
  })
}

export const bootstrapApp = (): void => {
  const app = document.querySelector<HTMLDivElement>('#app')
  let currentLocale: Locale = resolveInitialLocale()
  document.documentElement.lang = currentLocale
  let currentRoute: Route = resolveCurrentRoute()

  const mount = (preserveToolContent = false): void => {
    if (!app) return

    // A locale switch keeps the mounted tool (and whatever the user entered) and only relabels it.
    const preservedToolContentRoot =
      preserveToolContent && currentRoute.type === 'tool'
        ? app.querySelector<HTMLElement>('[data-tool-content-root]')
        : null
    if (!preservedToolContentRoot) {
      unmountToolContent()
    }

    currentRoute = resolveCurrentRoute()
    const route = currentRoute
    const messages = messagesByLocale[currentLocale]
    // Lets several open tools be told apart by their browser tab.
    document.title =
      route.type === 'dashboard'
        ? SITE_TITLE
        : `${route.type === 'tool' ? messages.tools[route.toolId].name : messages.categories[route.categoryId].name} – ${SITE_TITLE}`
    const pageHtml =
      route.type === 'dashboard'
        ? renderDashboard(currentLocale)
        : route.type === 'category'
          ? renderCategoryPage(currentLocale, route.categoryId)
          : renderToolPage(currentLocale, route.categoryId, route.toolId)

    if (preservedToolContentRoot) {
      replacePageAroundTool(preservedToolContentRoot, pageHtml)
      updateMountedToolLocale(currentLocale)
    } else {
      app.innerHTML = pageHtml
      if (route.type === 'tool') {
        // Tools with lazily loaded dependencies mount once their chunk arrives.
        void mountToolContent(route.toolId, currentLocale)
      }
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
