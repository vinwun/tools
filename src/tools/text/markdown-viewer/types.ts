export type MarkdownViewerStatus = 'empty' | 'ready'

export type MarkdownViewerState = {
  inputValue: string
  renderedHtml: string
  status: MarkdownViewerStatus
  selectedFileName: string | null
}

export type MarkdownViewerElements = {
  uploadLabel: HTMLElement
  uploadHint: HTMLElement
  input: HTMLTextAreaElement
  clearButton: HTMLButtonElement
  downloadButton: HTMLButtonElement
  inputLabel: HTMLElement
  outputLabel: HTMLElement
  status: HTMLElement
  outputContainer: HTMLElement
}
