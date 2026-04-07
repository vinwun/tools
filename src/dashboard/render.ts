import { dashboardCategories, type DashboardCategory } from './categories'
import { localeOptions, messagesByLocale, type Locale } from '../i18n'

export const LOCALE_SELECT_ID = 'locale-select'

const renderToolList = (tools: string[]) =>
  tools.map((tool) => `<li>${tool}</li>`).join('')

const renderLanguageOptions = (activeLocale: Locale) =>
  localeOptions
    .map(
      (locale) =>
        `<option value="${locale.code}" ${locale.code === activeLocale ? 'selected' : ''}>${locale.flag} ${locale.code.toUpperCase()}</option>`,
    )
    .join('')

const renderCategoryCard = (category: DashboardCategory, locale: Locale) => {
  const localizedCategory = messagesByLocale[locale].categories[category.id]

  return `
    <article class="dashboard-card" style="--card-accent: ${category.color};">
      <h2>${localizedCategory.name}</h2>
      <p>${localizedCategory.description}</p>
      <ul>
        ${renderToolList(localizedCategory.tools)}
      </ul>
    </article>
  `
}

export const renderDashboard = (locale: Locale) => {
  const messages = messagesByLocale[locale]
  const categoryCards = dashboardCategories
    .map((category) => renderCategoryCard(category, locale))
    .join('')

  return `
    <main class="dashboard-page">
      <header class="dashboard-header">
        <div class="dashboard-header-top">
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
