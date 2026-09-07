export type UnicodeConverterState = {
  cp: number
}

export type UnicodeCategoryKey =
  | 'letter'
  | 'digit'
  | 'punctuation'
  | 'symbol'
  | 'whitespace'
  | 'control'
  | 'other'

export type UnicodeConverterElements = {
  characterInput: HTMLInputElement
  codePointInput: HTMLInputElement
  decimalInput: HTMLInputElement
  binaryInput: HTMLInputElement
  octalInput: HTMLInputElement
  utf8Input: HTMLInputElement
  utf16Input: HTMLInputElement
  category: HTMLElement
  ascii: HTMLElement
}
