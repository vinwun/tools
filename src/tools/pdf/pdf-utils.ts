export const ACCEPTED_PDF_TYPES = '.pdf'

export const isPdfFile = (file: File): boolean =>
  file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
