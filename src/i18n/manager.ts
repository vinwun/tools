import { defaultLocale, hasLocale, type Locale } from './index'

const LOCALE_STORAGE_KEY = 'tools.locale'

/**
 * Resolves the initial locale from localStorage or returns the default locale.
 */
export const resolveInitialLocale = (): Locale => {
  try {
    const storedLocale = localStorage.getItem(LOCALE_STORAGE_KEY)

    if (storedLocale && hasLocale(storedLocale)) {
      return storedLocale
    }
  } catch {
    // Browsers can deny storage access entirely (blocked site data, third-party
    // iframes), so reading must never break the initial render.
  }

  return defaultLocale
}

/**
 * Persists a locale selection to localStorage and syncs the HTML document lang attribute.
 */
export const persistLocale = (locale: Locale): void => {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  } catch {
    // Persisting is a convenience; a denied or full storage must not block the
    // locale switch itself.
  }

  document.documentElement.lang = locale
}

/**
 * Initializes the locale by setting the document language.
 */
export const initLocale = (locale: Locale): void => {
  document.documentElement.lang = locale
}
