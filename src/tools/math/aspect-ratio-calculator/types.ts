export type AspectRatioCalculatorState = {
  widthValue: string
  heightValue: string
  reducedText: string
  decimalText: string
}

export type AspectRatioCalculatorElements = {
  widthInput: HTMLInputElement
  heightInput: HTMLInputElement
  reducedOutput: HTMLOutputElement
  decimalOutput: HTMLOutputElement
  widthLabel: HTMLElement
  heightLabel: HTMLElement
  reducedLabel: HTMLElement
  decimalLabel: HTMLElement
}
