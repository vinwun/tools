import type { Locale } from '../../../i18n'

export type VideoAudioSplitterState = {
  fileName: string
  file: File | null
  source: Uint8Array | null
  duration: number
  fragmented: boolean
  trackCount: number
  videoTrackCount: number
  audioTrackCount: number
  isProcessing: boolean
  errorReason: string | null
  locale: Locale
}

export type VideoAudioSplitterElements = {
  status: HTMLElement
  preview: HTMLVideoElement
  durationValue: HTMLElement
  formatValue: HTMLElement
  tracksValue: HTMLElement
  audioDownload: HTMLButtonElement
  silentDownload: HTMLButtonElement
}
