import { messagesByLocale, type Locale } from '../i18n'
import { renderLanguageOptions } from '../i18n/render.ts'

export const LOCALE_SELECT_ID = 'locale-select'

/**
 * Page header shell shared by the dashboard, category and tool pages: the caller's title block on
 * the left, the locale switcher on the right.
 */
export const renderPageHeader = (locale: Locale, titleBlock: string): string => {
  const messages = messagesByLocale[locale]

  return `
      <header class="page-header">
        <div class="page-header-top">
          <div>
            ${titleBlock}
          </div>
          <label class="locale-switcher" for="${LOCALE_SELECT_ID}">
            <span>${messages.dashboard.languageLabel}</span>
            <select id="${LOCALE_SELECT_ID}" aria-label="${messages.dashboard.languageLabel}">
              ${renderLanguageOptions(locale)}
            </select>
          </label>
        </div>
      </header>`
}
