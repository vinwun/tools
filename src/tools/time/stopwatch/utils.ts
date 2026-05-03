import type { StopwatchState } from './types.ts'

const DEFAULT_ELAPSED_MS = 0

export const createInitialStopwatchState = (): StopwatchState => ({
  status: 'idle',
  startTimestamp: 0,
  elapsedMs: DEFAULT_ELAPSED_MS,
  laps: [],
})

const padTimePart = (value: number): string => String(value).padStart(2, '0')

export const formatStopwatchTime = (elapsedMs: number): string => {
  const totalHundredths = Math.floor(elapsedMs / 10)
  const hundredths = totalHundredths % 100
  const totalSeconds = Math.floor(totalHundredths / 100)
  const seconds = totalSeconds % 60
  const totalMinutes = Math.floor(totalSeconds / 60)
  const minutes = totalMinutes % 60
  const hours = Math.floor(totalMinutes / 60)

  if (hours > 0) {
    return `${padTimePart(hours)}:${padTimePart(minutes)}:${padTimePart(seconds)}.${padTimePart(hundredths)}`
  }

  return `${padTimePart(minutes)}:${padTimePart(seconds)}.${padTimePart(hundredths)}`
}
