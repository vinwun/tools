import type { Messages } from '../../../i18n/schema.ts'

export type ConverterResultData = {
  blob: Blob
  fileName: string
  mimeType: string
  previewKind: 'image' | 'audio' | 'none'
}

export type ConverterResult =
  | { ok: true; data: ConverterResultData }
  | { ok: false; reason: 'unsupportedOutput' | 'conversionFailed'; details?: string }

export type ConverterOutputFormat = {
  id: string
  label: string
}

export type ConverterMessages = Messages['fileConverter']

export type FileConverterConfig = {
  id: string
  inputAccept: string
  outputFormats: readonly ConverterOutputFormat[]
  convert: (file: File, outputFormatId: string) => Promise<ConverterResult>
}

export type FileConverterTool = {
  render: (messages: Messages) => string
  mount: (container: HTMLElement, messages: Messages) => void
  updateLocale: (container: HTMLElement, messages: Messages) => void
}
