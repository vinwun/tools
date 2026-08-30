export type LoremIpsumUnit = 'characters' | 'words' | 'sentences' | 'paragraphs'

export type LoremIpsumGeneratorState = {
  amount: number
  unit: LoremIpsumUnit
  startWithClassic: boolean
  outputValue: string
}

export type LoremIpsumGeneratorElements = {
  form: HTMLFormElement
  amountInput: HTMLInputElement
  unitSelect: HTMLSelectElement
  classicCheckbox: HTMLInputElement
  generateButton: HTMLButtonElement
  copyButton: HTMLButtonElement
  clearButton: HTMLButtonElement
  output: HTMLTextAreaElement
  status: HTMLElement
  settingsLegend: HTMLElement
  amountLabel: HTMLElement
  unitLabel: HTMLElement
  classicLabel: HTMLElement
  outputLabel: HTMLElement
  unitOptionCharacters: HTMLOptionElement
  unitOptionWords: HTMLOptionElement
  unitOptionSentences: HTMLOptionElement
  unitOptionParagraphs: HTMLOptionElement
}
