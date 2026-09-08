export type MarkdownViewerStatus = 'empty' | 'ready'

export type MarkdownViewerState = {
  inputValue: string
  renderedHtml: string
  renderedDocument: string
  status: MarkdownViewerStatus
  selectedFileName: string | null
}

export type MarkdownViewerElements = {
  form: HTMLFormElement
  uploadLabel: HTMLElement
  uploadHint: HTMLElement
  input: HTMLTextAreaElement
  renderButton: HTMLButtonElement
  clearButton: HTMLButtonElement
  downloadButton: HTMLButtonElement
  inputLabel: HTMLElement
  outputLabel: HTMLElement
  status: HTMLElement
  outputContainer: HTMLElement
}
