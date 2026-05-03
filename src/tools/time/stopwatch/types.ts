export type StopwatchStatus = 'idle' | 'running' | 'paused'

export type StopwatchState = {
  status: StopwatchStatus
  startTimestamp: number
  elapsedMs: number
  laps: number[]
}

export type StopwatchElements = {
  display: HTMLOutputElement
  primaryButton: HTMLButtonElement
  secondaryButton: HTMLButtonElement
  lapsTitle: HTMLElement
  lapsCount: HTMLElement
  lapsList: HTMLOListElement
  lapsEmpty: HTMLElement
}
