import type { Messages } from '../../../i18n/schema.ts'
import type { TimezoneConverterElements } from './types.ts'
import { TIMEZONE_GROUPS } from './timezones.ts'
import { formatTimeInput, getLocalOffsetMinutes, normalizeMinutes, parseTimeInput } from './utils.ts'
import { queryRequired } from '../../foundations/dom.ts'
import type { MountTool } from '../../types.ts'

const buildOffsetLookup = (): Map<string, number> => {
  const offsets = new Map<string, number>()

  TIMEZONE_GROUPS.flat().forEach((zone) => {
    offsets.set(zone.id, zone.offsetMinutes)
  })

  return offsets
}

export const mountTimezoneConverter: MountTool = (container, initialMessages) => {
  const elements = queryRequired<TimezoneConverterElements>(container, {
    statusText: '[data-timezone-status-text]',
    statusAction: '[data-timezone-status-action]',
    localInput: '[data-timezone-local-input]',
    localLabel: '[data-timezone-local-label]',
    localHint: '[data-timezone-local-hint]',
  })
  const zoneInputs = Array.from(container.querySelectorAll<HTMLInputElement>('[data-timezone-input]'))
  if (!elements || zoneInputs.length === 0) {
    return {}
  }

  let messages = initialMessages
  const offsetById = buildOffsetLookup()

  const now = new Date()
  let localOffsetMinutes = getLocalOffsetMinutes(now)
  let baseUtcMinutes = normalizeMinutes(now.getHours() * 60 + now.getMinutes() - localOffsetMinutes)
  let autoSyncTimeoutId: number | null = null
  let autoSyncIntervalId: number | null = null

  const applyTimes = (): void => {
    elements.localInput.value = formatTimeInput(baseUtcMinutes + localOffsetMinutes)

    zoneInputs.forEach((input) => {
      const zoneId = input.dataset.timezoneId
      const offset = zoneId ? offsetById.get(zoneId) ?? 0 : 0
      input.value = formatTimeInput(baseUtcMinutes + offset)
    })
  }

  const getMinuteDiff = (left: number, right: number): number => {
    const diff = Math.abs(left - right)
    return Math.min(diff, 1440 - diff)
  }

  const clearAutoSync = (): void => {
    if (autoSyncTimeoutId !== null) {
      clearTimeout(autoSyncTimeoutId)
      autoSyncTimeoutId = null
    }
    if (autoSyncIntervalId !== null) {
      clearInterval(autoSyncIntervalId)
      autoSyncIntervalId = null
    }
  }

  const refreshToCurrentTime = (): void => {
    const current = new Date()
    localOffsetMinutes = getLocalOffsetMinutes(current)
    baseUtcMinutes = normalizeMinutes(current.getHours() * 60 + current.getMinutes() - localOffsetMinutes)
    applyTimes()
  }

  const startAutoSync = (): void => {
    if (autoSyncTimeoutId !== null || autoSyncIntervalId !== null) {
      return
    }

    refreshToCurrentTime()
    const current = new Date()
    const msToNextMinute = 60000 - (current.getSeconds() * 1000 + current.getMilliseconds())
    autoSyncTimeoutId = window.setTimeout(() => {
      autoSyncTimeoutId = null
      refreshToCurrentTime()
      autoSyncIntervalId = window.setInterval(refreshToCurrentTime, 60000)
    }, msToNextMinute)
  }

  const updateAutoSyncState = (): void => {
    const current = new Date()
    const currentLocalMinutes = current.getHours() * 60 + current.getMinutes()
    const effectiveOffset = getLocalOffsetMinutes(current)
    const computedLocalMinutes = normalizeMinutes(baseUtcMinutes + effectiveOffset)
    const diff = getMinuteDiff(currentLocalMinutes, computedLocalMinutes)

    if (diff === 0) {
      startAutoSync()
      elements.statusText.textContent = messages.timezoneConverter.statusCurrent
      elements.statusAction.disabled = true
    } else {
      clearAutoSync()
      elements.statusText.textContent = messages.timezoneConverter.statusOutdated
      elements.statusAction.disabled = false
    }
  }

  const syncLocale = (nextMessages: Messages): void => {
    messages = nextMessages
    elements.statusAction.textContent = messages.timezoneConverter.setCurrentAction
    elements.localLabel.textContent = messages.timezoneConverter.localTimeLabel
    elements.localHint.textContent = messages.timezoneConverter.localTimeHint
    elements.localInput.setAttribute('aria-label', messages.timezoneConverter.localTimeLabel)

    zoneInputs.forEach((input) => {
      const zoneId = input.dataset.timezoneId
      if (!zoneId) {
        return
      }

      const label = messages.timezoneConverter.zones[zoneId] ?? zoneId
      const ariaLabel = messages.timezoneConverter.timeInputLabel.replace('{zone}', label)
      input.setAttribute('aria-label', ariaLabel)

      const entry = input.closest<HTMLElement>('.timezone-entry')
      const labelNode = entry?.querySelector<HTMLElement>('[data-timezone-label]')
      if (labelNode) {
        labelNode.textContent = `${label}:`
      }
    })

    updateAutoSyncState()
  }

  const handleInputChange = (offsetMinutes: number, input: HTMLInputElement): void => {
    const minutes = parseTimeInput(input.value)
    if (minutes === null) {
      return
    }

    baseUtcMinutes = normalizeMinutes(minutes - offsetMinutes)
    applyTimes()
    updateAutoSyncState()
  }

  elements.localInput.addEventListener('input', () => {
    handleInputChange(localOffsetMinutes, elements.localInput)
  })

  zoneInputs.forEach((input) => {
    const zoneId = input.dataset.timezoneId
    const offset = zoneId ? offsetById.get(zoneId) ?? 0 : 0
    input.addEventListener('input', () => {
      handleInputChange(offset, input)
    })
  })

  elements.statusAction.addEventListener('click', () => {
    refreshToCurrentTime()
    updateAutoSyncState()
  })

  syncLocale(messages)
  applyTimes()
  updateAutoSyncState()

  return { updateLocale: syncLocale, destroy: clearAutoSync }
}
