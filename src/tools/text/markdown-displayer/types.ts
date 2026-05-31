export type MarkdownDisplayerStatus = 'empty' | 'ready'

export type MarkdownDisplayerState = {
  inputValue: string
  renderedHtml: string
  renderedDocument: string
  status: MarkdownDisplayerStatus
  selectedFileName: string | null
}

export type MarkdownDisplayerElements = {
  form: HTMLFormElement
  uploadInput: HTMLInputElement
  uploadDropZone: HTMLElement
  uploadLabel: HTMLElement
  uploadFileButton: HTMLButtonElement
  uploadFileName: HTMLElement
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
