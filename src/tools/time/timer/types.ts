export type TimerStatus = 'idle' | 'running' | 'paused' | 'completed'

export type TimerState = {
  status: TimerStatus
  durationMs: number
  remainingMs: number
  startTimestamp: number
}

export type TimerElements = {
  display: HTMLOutputElement
  primaryButton: HTMLButtonElement
  secondaryButton: HTMLButtonElement
  soundToggle?: HTMLButtonElement
  notifyToggle?: HTMLButtonElement
}
