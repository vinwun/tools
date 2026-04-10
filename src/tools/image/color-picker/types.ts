export type RGBColor = {
  r: number
  g: number
  b: number
}

export type HSLColor = {
  h: number
  s: number
  l: number
}

export type ColorState = {
  rgb: RGBColor
  hsl: HSLColor
}

export type ColorPickerElements = {
  spectrumCanvas: HTMLCanvasElement
  spectrumHandle: HTMLElement
  hueCanvas: HTMLCanvasElement
  hueHandle: HTMLElement
  hexInput: HTMLInputElement
  hexCopyButton: HTMLButtonElement
  copyPopup: HTMLElement
  redInput: HTMLInputElement
  greenInput: HTMLInputElement
  blueInput: HTMLInputElement
  hueInput: HTMLInputElement
  saturationInput: HTMLInputElement
  lightnessInput: HTMLInputElement
}
