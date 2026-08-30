export type HiddenCharCategory = 'bidi' | 'zeroWidth' | 'control' | 'separator' | 'confusable'

export type HiddenCharMatch = {
  character: string
  codePoint: number
  category: HiddenCharCategory
}

export type HiddenCharactersInspectorState = {
  inputValue: string
}

export type HiddenCharactersInspectorElements = {
  form: HTMLFormElement
  input: HTMLTextAreaElement
  clearButton: HTMLButtonElement
  exampleButton: HTMLButtonElement
  inputLabel: HTMLElement
  countValue: HTMLElement
  countLabel: HTMLElement
  previewLabel: HTMLElement
  preview: HTMLElement
  empty: HTMLElement
}