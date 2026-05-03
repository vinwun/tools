import type { Messages } from '../../../i18n/schema.ts'
import { renderTimerDisplayMarkup } from './utils.ts'

export const renderTimer = (messages: Messages): string => {
  return `
    <section class="tool-layout timer-layout" data-timer-root>
      <div class="tool-panel timer-panel timer-panel-main">
        <output
          class="timer-display"
          data-timer-display
          aria-live="polite"
          aria-label="${messages.timer.remainingLabel}"
        >${renderTimerDisplayMarkup(0, false)}</output>
        <div class="timer-actions">
          <button type="button" class="tool-action timer-primary" data-timer-primary>${messages.timer.startAction}</button>
          <button type="button" class="tool-action timer-secondary" data-timer-secondary disabled>${messages.timer.resetAction}</button>
          <button type="button" class="tool-action timer-toggle" data-timer-sound aria-pressed="true" title="Sound">🔔</button>
          <button type="button" class="tool-action timer-toggle" data-timer-notify aria-pressed="true" title="Notification">🖥️</button>
        </div>
      </div>
    </section>
  `
}
