export type PdfTextExtractorFormat = 'md' | 'txt'

export type PdfTextExtractorResult = {
  fileName: string
  status: 'extracting' | 'ready' | 'error'
  plainText: string
  markdownText: string
}
