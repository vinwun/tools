export type FloatingPointFormatId = 'half' | 'float' | 'double'

export type FloatingPointInterpretation = 'zero' | 'subnormal' | 'normal' | 'infinity' | 'nan'

export type FloatingPointFormatDisplay = {
  sign: string
  exponent: string
  mantissa: string
  value: number
  interpretation: FloatingPointInterpretation
}

export type FloatingPointConverterState = {
  decimalValue: string
  decimalNumber: number
  formats: Record<FloatingPointFormatId, FloatingPointFormatDisplay>
}

export type FloatingPointFormatElements = {
  signInput: HTMLInputElement
  exponentInput: HTMLInputElement
  mantissaInput: HTMLInputElement
  title: HTMLElement
  signLabel: HTMLElement
  exponentLabel: HTMLElement
  mantissaLabel: HTMLElement
  valueLabel: HTMLElement
  deltaLabel: HTMLElement
  interpretationLabel: HTMLElement
  valueText: HTMLElement
  deltaText: HTMLElement
  interpretationText: HTMLElement
}

export type FloatingPointConverterElements = {
  decimalInput: HTMLInputElement
  decimalLabel: HTMLElement
  formats: Record<FloatingPointFormatId, FloatingPointFormatElements>
}
