export type TextCounterState = {
  inputValue: string
}

export type TextCounterStatKey =
  | 'characters'
  | 'words'
  | 'lines'
  | 'paragraphs'
  | 'sentences'
  | 'punctuation'
  | 'alphanumeric'
  | 'letters'
  | 'digits'
  | 'numbers'
  | 'whitespace'
  | 'symbols'

export type TextCounterElements = {
  input: HTMLTextAreaElement
  clearButton: HTMLButtonElement
  inputLabel: HTMLElement
  resultsLabel: HTMLElement
  statValues: Record<TextCounterStatKey, HTMLElement>
  statLabels: Record<TextCounterStatKey, HTMLElement>
}
