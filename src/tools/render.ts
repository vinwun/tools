import type { CategoryId } from '../dashboard/category-data.ts'
import { LOCALE_SELECT_ID } from '../dashboard/render.ts'
import { messagesByLocale, type Locale } from '../i18n'
import { renderLanguageOptions } from '../i18n/render.ts'
import { buildCategoryPath, buildDashboardPath } from '../navigation/router.ts'
import type { ToolId } from './catalog'
import { renderToolContent } from './registry'

export const renderToolPage = (
  locale: Locale,
  categoryId: CategoryId,
  toolId: ToolId,
): string => {
  const messages = messagesByLocale[locale]
  const category = messages.categories[categoryId]
  const tool = messages.tools[toolId]
  const toolContent = renderToolContent(toolId, locale)

  return `
    <main class="page-shell tool-page">
      <header class="page-header">
        <div class="page-header-top">
          <div>
            <nav class="breadcrumbs" aria-label="${messages.navigation.breadcrumbAriaLabel}">
              <a href="${buildDashboardPath()}" data-dashboard-link>${messages.navigation.toolsSegment}</a>
              <span>/</span>
              <a href="${buildCategoryPath(categoryId)}" data-category-link="${categoryId}">${category.name}</a>
              <span>/</span>
              <span aria-current="page">${tool.name}</span>
              <span>/</span>
            </nav>
            <h1>${tool.name}</h1>
            <p class="tool-description">${tool.description}</p>
          </div>
          <label class="locale-switcher" for="${LOCALE_SELECT_ID}">
            <span>${messages.dashboard.languageLabel}</span>
            <select id="${LOCALE_SELECT_ID}" aria-label="${messages.dashboard.languageLabel}">
              ${renderLanguageOptions(locale)}
            </select>
          </label>
        </div>
      </header>

      <button type="button" class="back-button" data-category-link="${categoryId}">${messages.navigation.backToCategory} \"${category.name}\"</button>

      <div data-tool-content-root>
        ${toolContent}
      </div>
    </main>
  `
}


