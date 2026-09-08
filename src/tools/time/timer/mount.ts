import type { Messages } from '../../../i18n/schema.ts'
import type { TimerElements, TimerState } from './types.ts'
import {
  adjustTimerDuration,
  createInitialTimerState,
  renderTimerDisplayMarkup,
} from './utils.ts'
import { createLocaleSyncRegistry } from '../../foundations/locale-sync.ts'

const timerLocale = createLocaleSyncRegistry<[Messages]>('[data-timer-root]')

const queryTimerElements = (container: HTMLElement): TimerElements | null => {
  const display = container.querySelector<HTMLOutputElement>('[data-timer-display]')
  const primaryButton = container.querySelector<HTMLButtonElement>('[data-timer-primary]')
  const secondaryButton = container.querySelector<HTMLButtonElement>('[data-timer-secondary]')
  const soundToggle = container.querySelector<HTMLButtonElement>('[data-timer-sound]')
  const notifyToggle = container.querySelector<HTMLButtonElement>('[data-timer-notify]')

  if (!display || !primaryButton || !secondaryButton) {
    return null
  }

  return {
    display,
    primaryButton,
    secondaryButton,
    soundToggle: soundToggle ?? undefined,
    notifyToggle: notifyToggle ?? undefined,
  }
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

export const mountTimer = (container: HTMLElement, initialMessages: Messages): void => {
  const root = container.querySelector<HTMLElement>('[data-timer-root]') ?? container
  const elements = queryTimerElements(container)

  if (!elements) {
    return
  }

  if (timerLocale.resync(root, initialMessages)) {
    return
  }

  let messages = initialMessages
  const state = createInitialTimerState()
  let rafId: number | null = null
  let completionTimeoutId: number | null = null

  // Preferences keys
  const SOUND_PREF_KEY = 'timer:playSound'
  const NOTIFY_PREF_KEY = 'timer:notify'

  const readPref = (key: string, defaultValue = true): boolean => {
    try {
      const raw = localStorage.getItem(key)
      return raw === null ? defaultValue : raw === '1'
    } catch {
      return defaultValue
    }
  }

  const writePref = (key: string, value: boolean): void => {
    try { localStorage.setItem(key, value ? '1' : '0') } catch {}
  }

  // WebAudio helpers
  let audioCtx: AudioContext | null = null
  let audioPrimed = false

  const primeAudio = (): void => {
    if (audioPrimed) return
    const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext
    if (!Ctor) return
    try {
      audioCtx = new Ctor()
      // resume in case it's suspended
      const ctx = audioCtx
      ctx?.resume?.().catch(() => {})
      audioPrimed = true
    } catch {
      audioCtx = null
    }
  }

  const playBeep = (volume = 0.08, duration = 220, frequency = 880): void => {
    try {
      const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext
      if (!Ctor) return
      const ctx = audioCtx ?? new Ctor()
      if (!audioCtx) audioCtx = ctx
      if (ctx.state === 'suspended') ctx.resume().catch(() => {})

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

      setTimeout(() => {
        try { osc.stop() } catch {}
      }, duration + 20)
    } catch {
      // noop
    }
  }

  // Notification helpers
  const requestNotificationPermission = async (): Promise<NotificationPermission> => {
    if (!('Notification' in window)) return 'denied'
    try { return await Notification.requestPermission() } catch { return 'denied' }
  }

  const showCompletionNotification = (title = 'Timer', body?: string, icon?: string): void => {
    if (!('Notification' in window)) return
    if (Notification.permission !== 'granted') return
    try {
      new Notification(title, { body: body ?? '', icon, silent: true })
    } catch {}
  }

  const updateToggleUI = (): void => {
    try {
      if (elements.soundToggle) {
        const on = readPref(SOUND_PREF_KEY, true)
        elements.soundToggle.setAttribute('aria-pressed', on ? 'true' : 'false')
        elements.soundToggle.textContent = on ? '🔔' : '🔕'
      }
      if (elements.notifyToggle) {
        const on = readPref(NOTIFY_PREF_KEY, true)
        elements.notifyToggle.setAttribute('aria-pressed', on ? 'true' : 'false')
        elements.notifyToggle.textContent = on ? '🖥️' : '✖️'
      }
    } catch {}
  }

  const updateDisplay = (remainingMs: number): void => {
    const boundedMs = Math.max(0, remainingMs)
    state.remainingMs = boundedMs
    const isActive = state.status !== 'idle'
    const displayMs = isActive ? Math.ceil(boundedMs / 1000) * 1000 : boundedMs
    elements.display.innerHTML = renderTimerDisplayMarkup(displayMs, isActive)

    // Keep the display mode aligned with the current timer state.
    elements.display.classList.toggle('disabled', isActive)
  }

  const handleWheelAdjust = (stepSeconds: number, event: WheelEvent): void => {
    if (state.status === 'running') {
      return
    }

    event.preventDefault()
    const direction = event.deltaY < 0 ? 1 : -1
    const nextDuration = adjustTimerDuration(state.durationMs, direction * stepSeconds)
    state.durationMs = nextDuration
    state.remainingMs = nextDuration
    updateDisplay(nextDuration)
    updateButtons()
  }

  const handleDisplayWheel = (event: WheelEvent): void => {
    if (state.status !== 'idle') {
      return
    }

    const bounds = elements.display.getBoundingClientRect()
    const relativeX = bounds.width > 0 ? (event.clientX - bounds.left) / bounds.width : 1

    if (relativeX < 1 / 3) {
      handleWheelAdjust(3600, event)
      return
    }

    if (relativeX < 2 / 3) {
      handleWheelAdjust(60, event)
      return
    }

    handleWheelAdjust(1, event)
  }

  const updateButtons = (): void => {
    elements.primaryButton.textContent = resolvePrimaryLabel(messages, state)
    elements.secondaryButton.textContent = messages.timer.resetAction
    elements.primaryButton.disabled = state.status !== 'running' && state.durationMs === 0
    elements.secondaryButton.disabled = state.status === 'idle' && state.durationMs === 0
  }

  const complete = (): void => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }

    // Cancel any pending completion/reset timers
    if (completionTimeoutId !== null) {
      clearTimeout(completionTimeoutId)
      completionTimeoutId = null
    }

    state.status = 'completed'
    // show 0 on completion
    state.remainingMs = 0
    updateDisplay(0)
    updateButtons()

    // Play sound and show notification according to user preferences
    const playSound = readPref(SOUND_PREF_KEY, true)
    const wantNotify = readPref(NOTIFY_PREF_KEY, true)

    if (playSound) {
      primeAudio()
      playBeep()
    }

    if (wantNotify && 'Notification' in window && Notification.permission === 'granted') {
      // try to resolve an icon path that works on GH Pages
      let iconUrl: string | undefined
      try {
        const base = location.origin + (location.pathname.replace(/\/$/, ''))
        iconUrl = `${base}/images/tool.png`
      } catch {
        iconUrl = undefined
      }
      showCompletionNotification('Timer', 'Die Zeit ist abgelaufen.', iconUrl)
    }

    // After a short pause showing 0s, reset back to idle (re-enable scrolling/grid view)
    try {
      completionTimeoutId = window.setTimeout(() => {
        completionTimeoutId = null
        reset()
      }, 1000) as unknown as number
    } catch {
      // ignore
    }
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
    // cancel any pending completion auto-reset when user starts again
    if (completionTimeoutId !== null) {
      clearTimeout(completionTimeoutId)
      completionTimeoutId = null
    }
    const previousStatus = state.status

    if (state.durationMs === 0) {
      return
    }

    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }

    state.status = 'running'
    if (previousStatus !== 'paused') {
      state.remainingMs = state.durationMs
    }
    state.startTimestamp = performance.now() - (state.durationMs - state.remainingMs)
    updateDisplay(state.remainingMs)

    // Remove class to un-gray the timer display and reset text color when resumed
    elements.display.classList.remove('paused')

    updateButtons()
    rafId = requestAnimationFrame(tick)

    // Disable wheel event listener when started
    elements.display.removeEventListener('wheel', handleDisplayWheel)
  }

  const pause = (): void => {
    // cancel any pending completion auto-reset when pausing
    if (completionTimeoutId !== null) {
      clearTimeout(completionTimeoutId)
      completionTimeoutId = null
    }
    if (state.status !== 'running') {
      return
    }

    const elapsedMs = performance.now() - state.startTimestamp
    const remainingMs = Math.max(0, state.durationMs - elapsedMs)

    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }

    state.status = 'paused'
    state.remainingMs = remainingMs
    updateDisplay(remainingMs)

    // Add class to gray out the timer display and change text color when paused
    elements.display.classList.add('paused')

    updateButtons() // Ensure the button text updates correctly

    // Disable wheel event listener when paused
    elements.display.removeEventListener('wheel', handleDisplayWheel)
  }

  const reset = (): void => {
    // cancel any pending completion auto-reset when resetting
    if (completionTimeoutId !== null) {
      clearTimeout(completionTimeoutId)
      completionTimeoutId = null
    }

    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }

    state.status = 'idle'
    state.remainingMs = state.durationMs
    updateDisplay(state.durationMs)
    updateButtons()

    // Re-enable wheel event listener when reset
    elements.display.addEventListener('wheel', handleDisplayWheel, { passive: false })
  }

  const syncLocale = (nextMessages: Messages): void => {
    messages = nextMessages
    elements.display.setAttribute('aria-label', messages.timer.remainingLabel)
    updateButtons()
  }

  timerLocale.register(root, syncLocale)
  elements.display.addEventListener('wheel', handleDisplayWheel, { passive: false })

  elements.primaryButton.addEventListener('click', () => {
    // Prime audio and request notification permission on first user gesture
    if (!audioPrimed) primeAudio()
    if (readPref(NOTIFY_PREF_KEY, true) && 'Notification' in window && Notification.permission === 'default') {
      // fire and forget; do not block start
      requestNotificationPermission().catch(() => {})
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

  // Toggle handlers (optional elements)
  if (elements.soundToggle) {
    elements.soundToggle.addEventListener('click', () => {
      const cur = readPref(SOUND_PREF_KEY, true)
      writePref(SOUND_PREF_KEY, !cur)
      updateToggleUI()
    })
  }

  if (elements.notifyToggle) {
    elements.notifyToggle.addEventListener('click', async () => {
      const cur = readPref(NOTIFY_PREF_KEY, true)
      const next = !cur
      writePref(NOTIFY_PREF_KEY, next)
      updateToggleUI()
      if (next && 'Notification' in window && Notification.permission === 'default') {
        await requestNotificationPermission().catch(() => {})
        updateToggleUI()
      }
    })
  }

  syncLocale(messages)
  updateDisplay(state.durationMs)
  updateButtons()
  updateToggleUI()
}

export const updateTimerLocale = timerLocale.update
