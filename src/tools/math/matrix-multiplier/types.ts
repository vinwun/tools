export type MatrixMultiplierState = {
  matrixAValue: string
  matrixBValue: string
  outputText: string
  statusText: string
  matrixADimensionsText: string
  matrixBDimensionsText: string
}

export type MatrixMultiplierElements = {
  matrixAInput: HTMLTextAreaElement
  matrixBInput: HTMLTextAreaElement
  output: HTMLPreElement
  status: HTMLElement
  matrixALabel: HTMLElement
  matrixBLabel: HTMLElement
  matrixHint: HTMLElement
  resultLabel: HTMLElement
  matrixADimensions: HTMLElement
  matrixBDimensions: HTMLElement
}
