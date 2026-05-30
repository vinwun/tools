export type JsonPrettyPrinterStatus = 'empty' | 'invalid' | 'ready'

export type JsonPrettyPrinterState = {
  inputValue: string
  indentSize: number
  formattedJson: string
  parsedValue: unknown | null
  status: JsonPrettyPrinterStatus
  selectedFileName: string | null
}

export type JsonPrettyPrinterElements = {
  form: HTMLFormElement
  uploadInput: HTMLInputElement
  uploadDropZone: HTMLElement
  uploadLabel: HTMLElement
  uploadFileButton: HTMLButtonElement
  uploadFileName: HTMLElement
  uploadHint: HTMLElement
  input: HTMLTextAreaElement
  indentSelect: HTMLSelectElement
  formatButton: HTMLButtonElement
  clearButton: HTMLButtonElement
  downloadButton: HTMLButtonElement
  inputLabel: HTMLElement
  indentLabel: HTMLElement
  indentOptionTwo: HTMLOptionElement
  indentOptionFour: HTMLOptionElement
  status: HTMLElement
  outputLabel: HTMLElement
  outputContainer: HTMLElement
}
