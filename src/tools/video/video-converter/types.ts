import type { Locale } from '../../../i18n'

export type VideoConverterState = {
  fileName: string
  file: File | null
  source: Uint8Array | null
  previewUrl: string | null
  duration: number
  fragmented: boolean
  trackCount: number
  videoTrackCount: number
  audioTrackCount: number
  isProcessing: boolean
  errorReason: string | null
  locale: Locale
}

export type VideoConverterElements = {
  fileInput: HTMLInputElement
  browseButton: HTMLButtonElement
  dropzone: HTMLElement
  fileName: HTMLElement
  status: HTMLElement
  preview: HTMLVideoElement
  durationValue: HTMLElement
  formatValue: HTMLElement
  tracksValue: HTMLElement
  audioDownload: HTMLButtonElement
  silentDownload: HTMLButtonElement
}
