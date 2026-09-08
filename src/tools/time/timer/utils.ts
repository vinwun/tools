import { clamp } from '../../foundations/numbers.ts'
import type { TimerState } from './types.ts'

const MAX_TIMER_HOURS = 99
const MAX_TIMER_MINUTES = 59
const MAX_TIMER_SECONDS = 59
const MAX_TIMER_TOTAL_SECONDS = ((MAX_TIMER_HOURS * 60) + MAX_TIMER_MINUTES) * 60 + MAX_TIMER_SECONDS

export type TimerDisplayTriplet = {
  previous: number
  current: number
  next: number
}

const formatTimerDisplayValue = (value: number): string => String(value).padStart(2, '0')

export const createInitialTimerState = (): TimerState => ({
  status: 'idle',
  durationMs: 0,
  remainingMs: 0,
  startTimestamp: 0,
})

export const splitTimerDuration = (durationMs: number): { hours: number; minutes: number; seconds: number } => {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000))
  const seconds = totalSeconds % 60
  const totalMinutes = Math.floor(totalSeconds / 60)
  const minutes = totalMinutes % 60
  const hours = Math.floor(totalMinutes / 60)

  return {
    hours: clamp(hours, 0, MAX_TIMER_HOURS),
    minutes: clamp(minutes, 0, MAX_TIMER_MINUTES),
    seconds: clamp(seconds, 0, MAX_TIMER_SECONDS),
  }
}


export const adjustTimerDuration = (durationMs: number, deltaSeconds: number): number => {
  const totalSeconds = Math.floor(durationMs / 1000)
  const nextTotalSeconds = clamp(totalSeconds + deltaSeconds, 0, MAX_TIMER_TOTAL_SECONDS)

  return nextTotalSeconds * 1000
}

export const resolveTimerDisplayTriplet = (
  value: number,
  max: number,
  shouldWrap: boolean,
  clampLowerAtZero: boolean,
): TimerDisplayTriplet => {
  if (shouldWrap) {
    return {
      previous: value === 0 ? (clampLowerAtZero ? 0 : max) : value - 1,
      current: value,
      next: value === max ? 0 : value + 1,
    }
  }

  return {
    previous: Math.max(0, value - 1),
    current: value,
    next: Math.min(max, value + 1),
  }
}

export const renderTimerDisplayMarkup = (durationMs: number, isActive: boolean): string => {
  const { hours, minutes, seconds } = splitTimerDuration(durationMs)
  const triplets = {
    hours: resolveTimerDisplayTriplet(hours, MAX_TIMER_HOURS, false, true),
    minutes: resolveTimerDisplayTriplet(minutes, MAX_TIMER_MINUTES, true, durationMs < 60000),
    seconds: resolveTimerDisplayTriplet(seconds, MAX_TIMER_SECONDS, true, durationMs === 0),
  }

  if (isActive) {
    return `
      <span class="timer-display-current">${formatTimerDisplayValue(triplets.hours.current)}:${formatTimerDisplayValue(triplets.minutes.current)}:${formatTimerDisplayValue(triplets.seconds.current)}</span>
    `
  }

  return `
    <span class="timer-display-grid">
      <span class="timer-display-unit">
        <span class="timer-display-part timer-display-part-previous">${formatTimerDisplayValue(triplets.hours.next)}</span>
        <span class="timer-display-part timer-display-part-current">${formatTimerDisplayValue(triplets.hours.current)}</span>
        <span class="timer-display-part timer-display-part-next">${formatTimerDisplayValue(triplets.hours.previous)}</span>
      </span>
      <span class="timer-display-unit">
        <span class="timer-display-part timer-display-part-previous">${formatTimerDisplayValue(triplets.minutes.next)}</span>
        <span class="timer-display-part timer-display-part-current">${formatTimerDisplayValue(triplets.minutes.current)}</span>
        <span class="timer-display-part timer-display-part-next">${formatTimerDisplayValue(triplets.minutes.previous)}</span>
      </span>
      <span class="timer-display-unit">
        <span class="timer-display-part timer-display-part-previous">${formatTimerDisplayValue(triplets.seconds.next)}</span>
        <span class="timer-display-part timer-display-part-current">${formatTimerDisplayValue(triplets.seconds.current)}</span>
        <span class="timer-display-part timer-display-part-next">${formatTimerDisplayValue(triplets.seconds.previous)}</span>
      </span>
    </span>
  `
}
