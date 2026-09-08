import type { Messages } from '../../../i18n/schema.ts'
import { formatStopwatchTime } from './utils.ts'

export const renderStopwatch = (messages: Messages): string => {
  const stopwatchMessages = messages.stopwatch

  return `
    <section class="tool-layout stopwatch-layout" data-stopwatch-root>
      <div class="tool-panel stopwatch-panel">
        <output
          class="tool-readout stopwatch-display"
          data-stopwatch-display
          aria-live="polite"
          aria-label="${stopwatchMessages.elapsedLabel}"
        >${formatStopwatchTime(0)}</output>
        <div class="tool-actions stopwatch-actions">
          <button type="button" class="tool-action stopwatch-primary" data-stopwatch-primary>${stopwatchMessages.startAction}</button>
          <button type="button" class="tool-action stopwatch-secondary" data-stopwatch-secondary disabled>${stopwatchMessages.resetAction}</button>
        </div>
      </div>

      <div class="tool-panel stopwatch-laps-panel">
        <div class="tool-panel-header stopwatch-laps-header">
          <h2 class="stopwatch-laps-title" data-stopwatch-laps-title>${stopwatchMessages.lapsTitle}</h2>
          <span class="stopwatch-laps-count" data-stopwatch-laps-count>${stopwatchMessages.lapsCountLabel.replace('{count}', '0')}</span>
        </div>
        <ol class="stopwatch-laps-list" data-stopwatch-laps-list hidden></ol>
        <p class="tool-hint stopwatch-laps-empty" data-stopwatch-laps-empty>${stopwatchMessages.lapsEmpty}</p>
      </div>
    </section>
  `
}
