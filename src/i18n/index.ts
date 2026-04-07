import { deMessages } from './locales/de'
import { enMessages } from './locales/en'

export const messagesByLocale = {
  de: deMessages,
  en: enMessages,
} as const

export type Locale = keyof typeof messagesByLocale

export type LocaleOption = {
  code: Locale
  flag: string
  label: string
}

export const localeOptions: LocaleOption[] = [
  { code: 'de', flag: '🇩🇪', label: 'Deutsch' },
  { code: 'en', flag: '🇬🇧', label: 'English' },
]

export const defaultLocale: Locale = 'en'

export const hasLocale = (value: string): value is Locale => value in messagesByLocale
