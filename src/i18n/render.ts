import { localeOptions, type Locale } from './index'

export const renderLanguageOptions = (activeLocale: Locale): string =>
  localeOptions.map(
      (locale) =>
        `<option value="${locale.code}" ${locale.code === activeLocale ? 'selected' : ''}>${locale.label}</option>`,
    ).join('')
