import type { Messages } from '../../../i18n/schema.ts'
import type { StopwatchElements, StopwatchState } from './types.ts'
import { createInitialStopwatchState, formatStopwatchTime } from './utils.ts'
import { queryRequired } from '../../foundations/dom.ts'
import type { MountTool } from '../../types.ts'

const resolvePrimaryLabel = (messages: Messages, state: StopwatchState): string => {
  const stopwatchMessages = messages.stopwatch

  if (state.status === 'running') {
    return stopwatchMessages.pauseAction
  }

  if (state.status === 'paused') {
    return stopwatchMessages.resumeAction
  }

  return stopwatchMessages.startAction
}

const resolveSecondaryLabel = (messages: Messages, state: StopwatchState): string => {
  const stopwatchMessages = messages.stopwatch
  return state.status === 'running' ? stopwatchMessages.lapAction : stopwatchMessages.resetAction
}

export const mountStopwatch: MountTool = (container, initialMessages) => {
  const elements = queryRequired<StopwatchElements>(container, {
    display: '[data-stopwatch-display]',
    primaryButton: '[data-stopwatch-primary]',
    secondaryButton: '[data-stopwatch-secondary]',
    lapsTitle: '[data-stopwatch-laps-title]',
    lapsCount: '[data-stopwatch-laps-count]',
    lapsList: '[data-stopwatch-laps-list]',
    lapsEmpty: '[data-stopwatch-laps-empty]',
  })
  if (!elements) {
    return {}
  }

  let messages = initialMessages
  const state = createInitialStopwatchState()
  let rafId: number | null = null

  const updateDisplay = (elapsedMs: number): void => {
    state.elapsedMs = elapsedMs
    elements.display.textContent = formatStopwatchTime(elapsedMs)
  }

  const updateLapsView = (): void => {
    const stopwatchMessages = messages.stopwatch
    elements.lapsCount.textContent = stopwatchMessages.lapsCountLabel.replace('{count}', String(state.laps.length))

    while (elements.lapsList.firstChild) {
      elements.lapsList.removeChild(elements.lapsList.firstChild)
    }

    const lapEntries = state.laps.map((lapTime, index) => {
      const previousLapTime = index === 0 ? 0 : state.laps[index - 1]
      const diff = Math.max(0, lapTime - previousLapTime)
      return { lapTime, diff, lapNumber: index + 1 }
    })

    const laps = [...lapEntries].reverse()
    laps.forEach((lap) => {
      const item = document.createElement('li')
      item.className = 'stopwatch-lap'

      const label = document.createElement('span')
      label.className = 'stopwatch-lap-label'
      label.textContent = stopwatchMessages.lapEntryLabel.replace('{index}', String(lap.lapNumber))

      const time = document.createElement('span')
      time.className = 'stopwatch-lap-time'
      time.textContent = formatStopwatchTime(lap.lapTime)

      const delta = document.createElement('span')
      delta.className = 'stopwatch-lap-delta'
      delta.textContent = `+${formatStopwatchTime(lap.diff)}`

      const metrics = document.createElement('span')
      metrics.className = 'stopwatch-lap-metrics'
      metrics.append(time, delta)

      item.append(label, metrics)
      elements.lapsList.append(item)
    })

    const hasLaps = state.laps.length > 0
    elements.lapsList.hidden = !hasLaps
    elements.lapsEmpty.hidden = hasLaps
  }

  const updateButtons = (): void => {
    elements.primaryButton.textContent = resolvePrimaryLabel(messages, state)
    elements.secondaryButton.textContent = resolveSecondaryLabel(messages, state)
    elements.secondaryButton.disabled =
      state.status !== 'running' && state.elapsedMs === 0 && state.laps.length === 0
  }

  const syncLocalizedText = (): void => {
    elements.lapsTitle.textContent = messages.stopwatch.lapsTitle
    elements.lapsEmpty.textContent = messages.stopwatch.lapsEmpty
    elements.display.setAttribute('aria-label', messages.stopwatch.elapsedLabel)
    updateButtons()
    updateLapsView()
  }

  const tick = (): void => {
    if (state.status !== 'running') {
      return
    }

    updateDisplay(performance.now() - state.startTimestamp)
    rafId = requestAnimationFrame(tick)
  }

  const start = (): void => {
    if (state.status === 'running') {
      return
    }

    state.status = 'running'
    state.startTimestamp = performance.now() - state.elapsedMs
    updateButtons()
    rafId = requestAnimationFrame(tick)
  }

  const pause = (): void => {
    if (state.status !== 'running') {
      return
    }

    state.status = 'paused'
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
    updateDisplay(performance.now() - state.startTimestamp)
    updateButtons()
  }

  const reset = (): void => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }

    state.status = 'idle'
    state.startTimestamp = 0
    state.elapsedMs = 0
    state.laps = []
    updateDisplay(0)
    updateButtons()
    updateLapsView()
  }

  const addLap = (): void => {
    if (state.status !== 'running') {
      return
    }

    const lapTime = performance.now() - state.startTimestamp
    updateDisplay(lapTime)
    state.laps.push(lapTime)
    updateLapsView()
  }

  const syncLocale = (nextMessages: Messages): void => {
    messages = nextMessages
    syncLocalizedText()
  }

  elements.primaryButton.addEventListener('click', () => {
    if (state.status === 'running') {
      pause()
    } else {
      start()
    }
  })

  elements.secondaryButton.addEventListener('click', () => {
    if (state.status === 'running') {
      addLap()
    } else {
      reset()
    }
  })

  syncLocalizedText()
  updateDisplay(state.elapsedMs)

  return {
    updateLocale: syncLocale,
    destroy: () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }
    },
  }
}
