import { localizeDecimalSeparator, resolveNumberLocale } from '../foundations/numbers.ts'
import type { Mp4FailureReason } from './mp4-utils.ts'

export const ACCEPTED_VIDEO_TYPES = '.mp4,.m4v'

export type VideoFailure = Mp4FailureReason | 'error'

export const formatVideoSeconds = (seconds: number, locale = resolveNumberLocale()): string => {
  const rounded = Math.round(seconds * 10) / 10
  return `${localizeDecimalSeparator(rounded.toFixed(1), locale)} s`
}

const UNSUPPORTED_FAILURES = new Set<VideoFailure>(['notMp4', 'unsupported', 'noTracks', 'noVideoTrack'])

export const describeVideoFailure = (
  messages: { statusUnsupported: string; statusTooLarge: string; statusError: string },
  failure: VideoFailure,
): string => {
  if (failure === 'tooLarge') {
    return messages.statusTooLarge
  }
  return UNSUPPORTED_FAILURES.has(failure) ? messages.statusUnsupported : messages.statusError
}

// Synchronous MP4 work right after a status change would otherwise run before the status is painted.
export const waitForPaint = (): Promise<void> =>
  new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))

// Space toggles the preview like in a media player, unless focus is on something Space operates.
export const bindSpacePlayback = (preview: HTMLMediaElement): (() => void) => {
  const handleKeydown = (event: KeyboardEvent): void => {
    const target = event.target
    const isInteractive =
      target instanceof HTMLElement && (target.matches('input, textarea, select, button, a, video, audio') || target.isContentEditable)
    if (event.code !== 'Space' || !preview.currentSrc || isInteractive) {
      return
    }

    event.preventDefault()
    if (preview.paused) {
      void preview.play()
    } else {
      preview.pause()
    }
  }
  document.addEventListener('keydown', handleKeydown)
  return () => document.removeEventListener('keydown', handleKeydown)
}
