import type { Mp4Analysis } from '../mp4-utils.ts'
import type { Locale } from '../../../i18n'

export type VideoCutterState = {
  fileName: string
  source: Uint8Array | null
  analysis: Mp4Analysis | null
  duration: number
  isFragmented: boolean
  isProcessing: boolean
  start: number
  end: number
  locale: Locale
}

export type VideoCutterElements = {
  status: HTMLElement
  preview: HTMLVideoElement
  startInput: HTMLInputElement
  startStepDown: HTMLButtonElement
  startStepUp: HTMLButtonElement
  endInput: HTMLInputElement
  endStepDown: HTMLButtonElement
  endStepUp: HTMLButtonElement
  playSelection: HTMLButtonElement
  playEnding: HTMLButtonElement
  previewDuration: HTMLInputElement
  actualStartLabel: HTMLElement
  cutDownload: HTMLButtonElement
}
