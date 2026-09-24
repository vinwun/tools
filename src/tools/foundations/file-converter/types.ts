import type { Messages } from '../../../i18n/schema.ts'

export type ConverterResultData = {
  blob: Blob
  fileName: string
  mimeType: string
  previewKind: 'image' | 'audio' | 'none'
}

export type ConverterResult =
  | { ok: true; data: ConverterResultData }
  | { ok: false; reason: 'unsupportedOutput' | 'conversionFailed' }

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
