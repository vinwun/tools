import { dashboardCategories, type DashboardCategory } from './category-data.ts'
import { messagesByLocale, type Locale } from '../i18n'
import { renderLanguageOptions } from '../i18n/render.ts'
import { buildCategoryPath } from '../navigation/router.ts'
import { getToolsForCategory } from '../tools/catalog'

export const LOCALE_SELECT_ID = 'locale-select'

const renderToolList = (tools: string[]) => tools.map((tool) => `<li>${tool}</li>`).join('')


const renderCategoryCard = (category: DashboardCategory, locale: Locale) => {
  const messages = messagesByLocale[locale]
  const localizedCategory = messages.categories[category.id]
  const localizedTools = getToolsForCategory(category.id).map((toolId) => messages.tools[toolId].name)

  return `
    <a class="dashboard-card dashboard-card-link" href="${buildCategoryPath(category.id)}" style="--card-accent: ${category.color};" data-category-link="${category.id}">
      <h2>${localizedCategory.name}</h2>
      <p>${localizedCategory.description}</p>
      <ul>
        ${renderToolList(localizedTools)}
      </ul>
    </a>
  `
}

export const renderDashboard = (locale: Locale) => {
  const messages = messagesByLocale[locale]
  const categoryCards = dashboardCategories
    .map((category) => renderCategoryCard(category, locale))
    .join('')

  return `
    <main class="page-shell">
      <header class="page-header">
        <div class="page-header-top">
          <div>
            <h1>${messages.dashboard.title}</h1>
            <p>${messages.dashboard.subtitle}</p>
          </div>
          <label class="locale-switcher" for="${LOCALE_SELECT_ID}">
            <span>${messages.dashboard.languageLabel}</span>
            <select id="${LOCALE_SELECT_ID}" aria-label="${messages.dashboard.languageLabel}">
              ${renderLanguageOptions(locale)}
            </select>
          </label>
        </div>
      </header>
      <section class="dashboard-grid" aria-label="${messages.dashboard.categoriesAriaLabel}">
        ${categoryCards}
      </section>
    </main>
  `
}
