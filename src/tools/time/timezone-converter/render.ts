import type { Messages } from '../../../i18n/schema.ts'
import { TIMEZONE_GROUPS } from './timezones.ts'

const renderTimezoneEntries = (messages: Messages): string => {
  const timeInputLabel = messages.timezoneConverter.timeInputLabel

  return TIMEZONE_GROUPS.flat()
    .map((zone) => {
      const label = messages.timezoneConverter.zones[zone.id] ?? zone.id
      const ariaLabel = timeInputLabel.replace('{zone}', label)

      return `
        <label class="timezone-entry">
          <span class="timezone-label" data-timezone-label data-timezone-id="${zone.id}">${label}:</span>
          <input
            type="time"
            step="60"
            class="timezone-time-input"
            data-timezone-input
            data-timezone-id="${zone.id}"
            aria-label="${ariaLabel}"
          />
        </label>
      `
    })
    .join('')
}

export const renderTimezoneConverter = (messages: Messages): string => {
  return `
    <section class="tool-layout timezone-layout" data-timezone-root>
      <div class="tool-panel timezone-panel">
        <div class="timezone-header">
          <div class="timezone-local-meta">
            <span class="timezone-local-label" data-timezone-local-label>${messages.timezoneConverter.localTimeLabel}</span>
            <span class="tool-hint timezone-local-hint" data-timezone-local-hint>${messages.timezoneConverter.localTimeHint}</span>
          </div>
          <div class="timezone-local-control">
            <input
              type="time"
              step="60"
              class="timezone-local-input"
              data-timezone-local-input
              aria-label="${messages.timezoneConverter.localTimeLabel}"
            />
          </div>
          <div class="timezone-status" data-timezone-status>
            <span class="timezone-status-text" data-timezone-status-text>${messages.timezoneConverter.statusCurrent}</span>
            <button
              type="button"
              class="tool-action timezone-status-action"
              data-timezone-status-action
              disabled
            >${messages.timezoneConverter.setCurrentAction}</button>
          </div>
        </div>

        <div class="timezone-grid">
          ${renderTimezoneEntries(messages)}
        </div>
      </div>
    </section>
  `
}
