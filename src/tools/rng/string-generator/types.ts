export type StringGeneratorEntry = {
  value: string
  weight: number
}

export type StringGeneratorState = {
  entriesText: string
  uniqueMode: boolean
  availableEntryIndices: number[]
  resultText: string
}

export type StringGeneratorElements = {
  form: HTMLFormElement
  entriesTextarea: HTMLTextAreaElement
  uniqueModeInput: HTMLInputElement
  generateButton: HTMLButtonElement
  resetButton: HTMLButtonElement
  resultOutput: HTMLOutputElement
  statusMessage: HTMLElement
  listLegend: HTMLElement
  listHint: HTMLElement
  optionsLegend: HTMLElement
  uniqueModeLabel: HTMLElement
  uniqueModeHint: HTMLElement
}
