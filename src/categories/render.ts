import type { CategoryId } from '../dashboard/category-data.ts'
import { LOCALE_SELECT_ID } from '../dashboard/render'
import { messagesByLocale, type Locale } from '../i18n'
import { renderLanguageOptions } from '../i18n/render.ts'
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
            aria-label="${tool.name}"
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
    <main class="page-shell category-page">
      <header class="page-header">
        <div class="page-header-top">
          <div>
            <nav class="breadcrumbs" aria-label="${messages.navigation.breadcrumbAriaLabel}">
              <a href="${dashboardPath}" data-dashboard-link>${messages.navigation.toolsSegment}</a>
              <span>/</span>
              <span aria-current="page">${category.name}</span>
              <span>/</span>
            </nav>
            <h1>${category.name}</h1>
            <p>${category.description}</p>
          </div>
          <label class="locale-switcher" for="${LOCALE_SELECT_ID}">
            <span>${messages.dashboard.languageLabel}</span>
            <select id="${LOCALE_SELECT_ID}" aria-label="${messages.dashboard.languageLabel}">
              ${renderLanguageOptions(locale)}
            </select>
          </label>
        </div>
      </header>

      <button type="button" class="back-button" data-dashboard-link>${messages.navigation.backToDashboard}</button>

      <section class="category-tools" aria-label="${messages.dashboard.categoriesAriaLabel}">
        <h2>${messages.navigation.availableTools}</h2>
        <ul class="category-tools-grid">
          ${renderToolLinks(locale, categoryId)}
        </ul>
      </section>
    </main>
  `
}


