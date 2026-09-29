import type { Messages } from '../../../i18n/schema.ts'
import type { TimerElements, TimerState } from './types.ts'
import {
  adjustTimerDuration,
  createInitialTimerState,
  renderTimerDisplayMarkup,
} from './utils.ts'
import { queryRequired } from '../../foundations/dom.ts'
import type { MountTool } from '../../types.ts'
// Inlined as a data URL: Firefox on Windows delays the toast by 1-2 s while it fetches a URL icon.
import notificationIconUrl from './notification-icon.png?inline'

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext
  }
}

const SOUND_PREF_KEY = 'timer:playSound'
const NOTIFY_PREF_KEY = 'timer:notify'
// Touch devices get no wheel event, so the display is draggable too.
const DRAG_PIXELS_PER_STEP = 22

// Storage can be unavailable (private mode, blocked site data); the timer then keeps its defaults.
const readPref = (key: string, defaultValue = true): boolean => {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? defaultValue : raw === '1'
  } catch {
    return defaultValue
  }
}

const writePref = (key: string, value: boolean): void => {
  try {
    localStorage.setItem(key, value ? '1' : '0')
  } catch {}
}

type Beeper = {
  // Browsers only let audio start from a user gesture, so the context is created on the first click.
  prime: () => void
  beep: () => void
  close: () => void
}

const createBeeper = (): Beeper => {
  const AudioContextCtor = window.AudioContext ?? window.webkitAudioContext
  let audioCtx: AudioContext | null = null

  const ensureContext = (): AudioContext | null => {
    if (!audioCtx && AudioContextCtor) {
      try {
        audioCtx = new AudioContextCtor()
      } catch {
        audioCtx = null
      }
    }
    if (audioCtx?.state === 'suspended') {
      audioCtx.resume().catch(() => {})
    }
    return audioCtx
  }

  return {
    prime: () => {
      ensureContext()
    },
    beep: (volume = 0.08, duration = 220, frequency = 880) => {
      const ctx = ensureContext()
      if (!ctx) return

      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = frequency
      gain.gain.value = volume

      osc.connect(gain)
      gain.connect(ctx.destination)

      const now = ctx.currentTime
      osc.start(now)
      gain.gain.setValueAtTime(volume, now)
      gain.gain.linearRampToValueAtTime(0.0001, now + duration / 1000)
      osc.stop(now + (duration + 20) / 1000)
    },
    close: () => {
      audioCtx?.close().catch(() => {})
      audioCtx = null
    },
  }
}

const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) return 'denied'
  try {
    return await Notification.requestPermission()
  } catch {
    return 'denied'
  }
}

const showCompletionNotification = (title: string, body: string): void => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  try {
    new Notification(title, { body, icon: notificationIconUrl, silent: true })
  } catch {}
}

const resolvePrimaryLabel = (messages: Messages, state: TimerState): string => {
  const timerMessages = messages.timer

  if (state.status === 'running') {
    return timerMessages.pauseAction
  }

  if (state.status === 'paused') {
    return timerMessages.resumeAction
  }

  return timerMessages.startAction
}

export const mountTimer: MountTool = (container, initialMessages) => {
  const elements = queryRequired<TimerElements>(container, {
    display: '[data-timer-display]',
    hint: '[data-timer-hint]',
    primaryButton: '[data-timer-primary]',
    secondaryButton: '[data-timer-secondary]',
    soundToggle: '[data-timer-sound]',
    notifyToggle: '[data-timer-notify]',
  })
  if (!elements) {
    return {}
  }

  let messages = initialMessages
  const state = createInitialTimerState()
  const beeper = createBeeper()
  let rafId: number | null = null
  let completionTimeoutId: number | null = null
  let displayedMarkup = ''

  const cancelRaf = (): void => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  }

  const cancelCompletionTimeout = (): void => {
    if (completionTimeoutId !== null) {
      clearTimeout(completionTimeoutId)
      completionTimeoutId = null
    }
  }

  // The icons stay fixed; timer.css shows the off state through `aria-pressed`.
  const updateToggleUI = (): void => {
    elements.soundToggle.setAttribute('aria-pressed', String(readPref(SOUND_PREF_KEY, true)))
    elements.notifyToggle.setAttribute('aria-pressed', String(readPref(NOTIFY_PREF_KEY, true)))
  }

  const updateDisplay = (remainingMs: number): void => {
    const boundedMs = Math.max(0, remainingMs)
    state.remainingMs = boundedMs
    const isActive = state.status !== 'idle'
    // A running timer shows whole seconds rounded up, so 00:00:00 only appears at completion.
    const displayMs = isActive ? Math.ceil(boundedMs / 1000) * 1000 : boundedMs
    const markup = renderTimerDisplayMarkup(displayMs, isActive)
    // Called every frame while running, but the digits change only once per second.
    if (markup !== displayedMarkup) {
      elements.display.innerHTML = markup
      displayedMarkup = markup
    }
    elements.display.classList.toggle('disabled', isActive)
  }

  const resolveStepSeconds = (clientX: number): number => {
    const bounds = elements.display.getBoundingClientRect()
    const relativeX = bounds.width > 0 ? (clientX - bounds.left) / bounds.width : 1

    if (relativeX < 1 / 3) {
      return 3600
    }

    if (relativeX < 2 / 3) {
      return 60
    }

    return 1
  }

  const setDuration = (nextDuration: number): void => {
    state.durationMs = nextDuration
    state.remainingMs = nextDuration
    updateDisplay(nextDuration)
    updateButtons()
  }

  const handleDisplayWheel = (event: WheelEvent): void => {
    if (state.status !== 'idle') {
      return
    }

    event.preventDefault()
    const direction = event.deltaY < 0 ? 1 : -1
    setDuration(adjustTimerDuration(state.durationMs, direction * resolveStepSeconds(event.clientX)))
  }

  let dragPointerId: number | null = null
  let dragStepSeconds = 1
  let dragOriginY = 0
  let dragOriginDurationMs = 0
  let dragAppliedSteps = 0

  const handleDisplayPointerDown = (event: PointerEvent): void => {
    if (state.status !== 'idle' || dragPointerId !== null) {
      return
    }

    dragPointerId = event.pointerId
    dragStepSeconds = resolveStepSeconds(event.clientX)
    dragOriginY = event.clientY
    dragOriginDurationMs = state.durationMs
    dragAppliedSteps = 0

    try {
      elements.display.setPointerCapture(event.pointerId)
    } catch {
      // The pointer can already be gone by the time the handler runs.
    }
  }

  const handleDisplayPointerMove = (event: PointerEvent): void => {
    if (dragPointerId !== event.pointerId || state.status !== 'idle') {
      return
    }

    // Higher values sit below, so swiping up pulls one into the middle, as the wheel does.
    const steps = Math.trunc((dragOriginY - event.clientY) / DRAG_PIXELS_PER_STEP)
    if (steps === dragAppliedSteps) {
      return
    }

    dragAppliedSteps = steps
    // Measured from the drag's start, so travel past 0 or the max builds up no debt to pay back.
    setDuration(adjustTimerDuration(dragOriginDurationMs, steps * dragStepSeconds))
  }

  const handleDisplayPointerEnd = (event: PointerEvent): void => {
    if (dragPointerId !== event.pointerId) {
      return
    }

    dragPointerId = null

    try {
      elements.display.releasePointerCapture(event.pointerId)
    } catch {
      // Capture may already have been released by the browser.
    }
  }

  const updateButtons = (): void => {
    elements.primaryButton.textContent = resolvePrimaryLabel(messages, state)
    elements.secondaryButton.textContent = messages.timer.resetAction
    elements.primaryButton.disabled = state.status !== 'running' && state.durationMs === 0
    elements.secondaryButton.disabled = state.status === 'idle' && state.durationMs === 0
  }

  const complete = (): void => {
    cancelRaf()
    cancelCompletionTimeout()

    state.status = 'completed'
    state.remainingMs = 0
    updateDisplay(0)
    updateButtons()

    if (readPref(SOUND_PREF_KEY, true)) {
      beeper.beep()
    }

    if (readPref(NOTIFY_PREF_KEY, true)) {
      showCompletionNotification(messages.tools.timer.name, messages.timer.completedNotification)
    }

    // Show 0 for a moment, then return to the adjustable idle display.
    completionTimeoutId = window.setTimeout(() => {
      completionTimeoutId = null
      reset()
    }, 1000)
  }

  const tick = (): void => {
    if (state.status !== 'running') {
      return
    }

    const elapsedMs = performance.now() - state.startTimestamp
    const remainingMs = Math.max(0, state.durationMs - elapsedMs)

    if (remainingMs <= 0) {
      complete()
      return
    }

    updateDisplay(remainingMs)
    rafId = requestAnimationFrame(tick)
  }

  const start = (): void => {
    cancelCompletionTimeout()
    const previousStatus = state.status

    if (state.durationMs === 0) {
      return
    }

    cancelRaf()

    state.status = 'running'
    if (previousStatus !== 'paused') {
      state.remainingMs = state.durationMs
    }
    state.startTimestamp = performance.now() - (state.durationMs - state.remainingMs)
    updateDisplay(state.remainingMs)
    elements.display.classList.remove('paused')

    updateButtons()
    rafId = requestAnimationFrame(tick)
    // Background tabs pause animation frames, so the end must not depend on `tick`.
    completionTimeoutId = window.setTimeout(complete, state.remainingMs)
    elements.display.removeEventListener('wheel', handleDisplayWheel)
  }

  const pause = (): void => {
    cancelCompletionTimeout()
    if (state.status !== 'running') {
      return
    }

    const elapsedMs = performance.now() - state.startTimestamp
    const remainingMs = Math.max(0, state.durationMs - elapsedMs)

    cancelRaf()

    state.status = 'paused'
    state.remainingMs = remainingMs
    updateDisplay(remainingMs)
    elements.display.classList.add('paused')

    updateButtons()
    elements.display.removeEventListener('wheel', handleDisplayWheel)
  }

  const reset = (): void => {
    cancelCompletionTimeout()
    cancelRaf()

    state.status = 'idle'
    state.remainingMs = state.durationMs
    updateDisplay(state.durationMs)
    updateButtons()
    elements.display.addEventListener('wheel', handleDisplayWheel, { passive: false })
  }

  const syncLocale = (nextMessages: Messages): void => {
    messages = nextMessages
    elements.display.setAttribute('aria-label', messages.timer.remainingLabel)
    elements.hint.textContent = messages.timer.adjustHint
    elements.soundToggle.title = messages.timer.soundToggleLabel
    elements.soundToggle.setAttribute('aria-label', messages.timer.soundToggleLabel)
    elements.notifyToggle.title = messages.timer.notifyToggleLabel
    elements.notifyToggle.setAttribute('aria-label', messages.timer.notifyToggleLabel)
    updateButtons()
  }

  elements.display.addEventListener('wheel', handleDisplayWheel, { passive: false })
  // Capture retargets move/up here; these guard on status, so they are never detached.
  elements.display.addEventListener('pointerdown', handleDisplayPointerDown)
  elements.display.addEventListener('pointermove', handleDisplayPointerMove)
  elements.display.addEventListener('pointerup', handleDisplayPointerEnd)
  elements.display.addEventListener('pointercancel', handleDisplayPointerEnd)

  elements.primaryButton.addEventListener('click', () => {
    // Audio and the permission prompt both need a user gesture, so ask on the first click.
    beeper.prime()
    if (readPref(NOTIFY_PREF_KEY, true) && 'Notification' in window && Notification.permission === 'default') {
      void requestNotificationPermission()
    }

    if (state.status === 'running') {
      pause()
    } else {
      start()
    }
  })

  elements.secondaryButton.addEventListener('click', () => {
    reset()
  })

  elements.soundToggle.addEventListener('click', () => {
    writePref(SOUND_PREF_KEY, !readPref(SOUND_PREF_KEY, true))
    updateToggleUI()
  })

  elements.notifyToggle.addEventListener('click', async () => {
    const next = !readPref(NOTIFY_PREF_KEY, true)
    writePref(NOTIFY_PREF_KEY, next)
    updateToggleUI()
    if (next && 'Notification' in window && Notification.permission === 'default') {
      await requestNotificationPermission()
      updateToggleUI()
    }
  })

  syncLocale(messages)
  updateDisplay(state.durationMs)
  updateButtons()
  updateToggleUI()

  return {
    updateLocale: syncLocale,
    destroy: () => {
      cancelRaf()
      cancelCompletionTimeout()
      beeper.close()
    },
  }
}
