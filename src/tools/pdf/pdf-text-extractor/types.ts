export type PdfTextExtractorFormat = 'md' | 'txt'

export type PdfTextExtractorEntry = {
  id: string
  file: File
  fileName: string
  status: 'extracting' | 'ready' | 'error'
  pageCount: number | null
  plainText: string
  markdownText: string
  error: string | null
}
