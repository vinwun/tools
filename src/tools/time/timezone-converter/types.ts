export type TimezoneDefinition = {
  id: string
  offsetMinutes: number
}

export type TimezoneConverterElements = {
  root: HTMLElement
  statusText: HTMLElement
  statusAction: HTMLButtonElement
  localInput: HTMLInputElement
  localLabel: HTMLElement
  localHint: HTMLElement | null
  zoneInputs: HTMLInputElement[]
}
