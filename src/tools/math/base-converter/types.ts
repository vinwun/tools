export type BaseConverterState = {
  binaryValue: string
  octalValue: string
  decimalValue: string
  hexValue: string
  customValue: string
  customBaseValue: string
  customBase: number
  numericValue: bigint
  romanValue: string
}

export type BaseConverterField = 'binary' | 'octal' | 'decimal' | 'hex' | 'custom' | 'roman'

export type BaseConverterElements = {
  binaryInput: HTMLInputElement
  octalInput: HTMLInputElement
  decimalInput: HTMLInputElement
  hexInput: HTMLInputElement
  customBaseInput: HTMLInputElement
  customValueInput: HTMLInputElement
  romanInput: HTMLInputElement
  binaryLabel: HTMLElement
  octalLabel: HTMLElement
  decimalLabel: HTMLElement
  hexLabel: HTMLElement
  customBaseLabel: HTMLElement
  customValueLabel: HTMLElement
  romanLabel: HTMLElement
}
