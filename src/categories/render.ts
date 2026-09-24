import type { CategoryId } from '../dashboard/category-data.ts'
import { messagesByLocale, type Locale } from '../i18n'
import { renderPageHeader } from '../navigation/render.ts'
import { buildDashboardPath, buildToolPath } from '../navigation/router.ts'
import { getToolsForCategory } from '../tools/catalog'

const renderToolLinks = (locale: Locale, categoryId: CategoryId): string => {
  const messages = messagesByLocale[locale]

  return getToolsForCategory(categoryId)
    .map((toolId) => {
      const tool = messages.tools[toolId]
      return `
        <li>
          <a
            class="tool-link-card"
            href="${buildToolPath(categoryId, toolId)}"
            data-tool-link="${toolId}"
            data-tool-category="${categoryId}"
          >
            <span class="tool-link-title">${tool.name}</span>
            <span class="tool-link-description">${tool.description}</span>
          </a>
        </li>
      `
    })
    .join('')
}

export const renderCategoryPage = (locale: Locale, categoryId: CategoryId) => {
  const messages = messagesByLocale[locale]
  const category = messages.categories[categoryId]
  const dashboardPath = buildDashboardPath()

  return `
    <main class="page-shell">
      ${renderPageHeader(locale, `
            <nav class="breadcrumbs" aria-label="${messages.navigation.breadcrumbAriaLabel}">
              <a href="${dashboardPath}" data-dashboard-link>${messages.navigation.toolsSegment}</a>
              <span>/</span>
              <span aria-current="page">${category.name}</span>
              <span>/</span>
            </nav>
            <h1>${category.name}</h1>
            <p>${category.description}</p>`)}

      <button type="button" class="back-button" data-dashboard-link>${messages.navigation.backToDashboard}</button>

      <section class="category-tools" aria-labelledby="category-tools-title">
        <h2 id="category-tools-title">${messages.navigation.availableTools}</h2>
        <ul class="category-tools-grid">
          ${renderToolLinks(locale, categoryId)}
        </ul>
      </section>
    </main>
  `
}
