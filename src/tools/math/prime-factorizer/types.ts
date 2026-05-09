export type PrimeFactorizerState = {
  decimalValue: string
  expandedValue: string
  exponentValue: string
}

export type PrimeFactorizerElements = {
  decimalInput: HTMLInputElement
  expandedInput: HTMLInputElement
  exponentInput: HTMLInputElement
  decimalLabel: HTMLElement
  decimalHint: HTMLElement
  expandedLabel: HTMLElement
  expandedHint: HTMLElement
  exponentLabel: HTMLElement
  exponentHint: HTMLElement
}

export type PrimeFactorizerField = 'decimal' | 'expanded' | 'exponent'
