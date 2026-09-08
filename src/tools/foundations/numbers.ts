export const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value))

// Either separator is accepted regardless of locale, but never both in one value and never more
// than one comma, so a grouped "1,000" is rejected instead of silently parsed as 1.
export const parseDecimalNumber = (value: string): number | null => {
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return null
  }

  const commaCount = (trimmed.match(/,/g) ?? []).length
  if (commaCount > 1 || (commaCount === 1 && trimmed.includes('.'))) {
    return null
  }

  const parsed = Number(commaCount === 1 ? trimmed.replace(',', '.') : trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

// Tools that render from `messages` alone read the active locale off the document.
export const resolveNumberLocale = (): string => document.documentElement.lang || 'en'

export const getDecimalSeparator = (locale: string): string =>
  new Intl.NumberFormat(locale).formatToParts(1.1).find((part) => part.type === 'decimal')?.value ?? '.'

// Rewrites a plain "12.5" into the locale separator without going through Intl.
export const localizeDecimalSeparator = (value: string, locale: string): string =>
  value.replace('.', getDecimalSeparator(locale))

export type DecimalFormatOptions = {
  minimumFractionDigits?: number
  maximumFractionDigits?: number
}

export const formatDecimalNumber = (
  value: number,
  locale: string,
  options: DecimalFormatOptions = {},
): string =>
  new Intl.NumberFormat(locale, {
    minimumFractionDigits: options.minimumFractionDigits ?? 0,
    maximumFractionDigits: options.maximumFractionDigits ?? 3,
    useGrouping: false,
  }).format(value)
