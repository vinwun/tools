import type { Locale } from '../../i18n'
import { localizeDecimalSeparator } from '../foundations/numbers.ts'

export const ACCEPTED_VIDEO_TYPES = '.mp4,.m4v'

export const formatVideoSeconds = (seconds: number, locale: Locale = 'en'): string => {
  const rounded = Math.round(seconds * 10) / 10
  return `${localizeDecimalSeparator(rounded.toFixed(1), locale)} s`
}
