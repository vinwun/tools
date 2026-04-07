import { defaultLocale, hasLocale, type Locale } from './index'

const LOCALE_STORAGE_KEY = 'tools.locale'

/**
 * Resolves the initial locale from localStorage or returns the default locale.
 */
export const resolveInitialLocale = (): Locale => {
  const storedLocale = localStorage.getItem(LOCALE_STORAGE_KEY)

  if (storedLocale && hasLocale(storedLocale)) {
    return storedLocale
  }

  return defaultLocale
}

/**
 * Persists a locale selection to localStorage and syncs the HTML document lang attribute.
 */
export const persistLocale = (locale: Locale): void => {
  localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  document.documentElement.lang = locale
}

/**
 * Initializes the locale by setting the document language.
 */
export const initLocale = (locale: Locale): void => {
  document.documentElement.lang = locale
}

