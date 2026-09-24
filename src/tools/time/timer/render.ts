import type { Messages } from '../../../i18n/schema.ts'
import { renderTimerDisplayMarkup } from './utils.ts'

export const renderTimer = (messages: Messages): string => {
  return `
    <section class="tool-layout timer-layout" data-timer-root>
      <div class="tool-panel timer-panel timer-panel-main">
        <output
          class="tool-readout timer-display"
          data-timer-display
          aria-live="off"
          aria-label="${messages.timer.remainingLabel}"
        >${renderTimerDisplayMarkup(0, false)}</output>
        <p class="tool-hint timer-hint" data-timer-hint>${messages.timer.adjustHint}</p>
        <div class="tool-actions timer-actions">
          <button type="button" class="tool-action timer-primary" data-timer-primary>${messages.timer.startAction}</button>
          <button type="button" class="tool-action timer-secondary" data-timer-secondary disabled>${messages.timer.resetAction}</button>
          <button type="button" class="tool-action timer-toggle" data-timer-sound aria-pressed="true" title="${messages.timer.soundToggleLabel}" aria-label="${messages.timer.soundToggleLabel}">🔔</button>
          <button type="button" class="tool-action timer-toggle" data-timer-notify aria-pressed="true" title="${messages.timer.notifyToggleLabel}" aria-label="${messages.timer.notifyToggleLabel}">🖥️</button>
        </div>
      </div>
    </section>
  `
}
