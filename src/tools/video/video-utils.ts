import type { Locale } from '../../i18n'

export const ACCEPTED_VIDEO_TYPES = '.mp4,.m4v'

export const downloadBlob = (blob: Blob, fileName: string): void => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const getDecimalSeparator = (locale: Locale): string =>
  new Intl.NumberFormat(locale).formatToParts(1.1).find((p) => p.type === 'decimal')?.value ?? '.'

export const formatVideoSeconds = (seconds: number, locale: Locale = 'en'): string => {
  const rounded = Math.round(seconds * 10) / 10
  const sep = getDecimalSeparator(locale)
  return `${rounded.toFixed(1).replace('.', sep)} s`
}
