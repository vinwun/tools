export type NumberGeneratorMode = 'integer' | 'decimal'

export type NumberGeneratorState = {
  minValue: string
  maxValue: string
  mode: NumberGeneratorMode
  resultMode: NumberGeneratorMode | null
  resultValue: number | null
  resultText: string
}

export type NumberGeneratorElements = {
  form: HTMLFormElement
  minInput: HTMLInputElement
  maxInput: HTMLInputElement
  integerModeInput: HTMLInputElement
  decimalModeInput: HTMLInputElement
  resultOutput: HTMLOutputElement
  generateButton: HTMLButtonElement
  settingsLegend: HTMLElement
  minLabel: HTMLElement
  maxLabel: HTMLElement
  integerModeLabel: HTMLElement
  decimalModeLabel: HTMLElement
}
