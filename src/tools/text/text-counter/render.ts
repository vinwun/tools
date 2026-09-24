import type { Messages } from '../../../i18n/schema.ts'
import type { TextCounterState } from './types.ts'
import { createInitialTextCounterState, TEXT_COUNTER_STAT_KEYS } from './utils.ts'

export const renderTextCounter = (
  messages: Messages,
  state: TextCounterState = createInitialTextCounterState(),
): string => {
  const textMessages = messages.textCounter
  const statRows = TEXT_COUNTER_STAT_KEYS.map(
    (key) => `
        <div class="text-counter-stat">
          <span class="text-counter-stat-value" data-text-counter-stat-value="${key}">0</span>
          <span class="text-counter-stat-label" data-text-counter-stat-label="${key}">${textMessages[key]}</span>
        </div>
      `,
  ).join('')

  return `
    <section class="tool-layout text-counter-layout" data-text-counter-root>
      <form class="tool-panel text-counter-panel" data-text-counter-form novalidate>
        <div class="tool-panel-header text-counter-head">
          <label class="text-counter-head-label" for="text-counter-input" data-text-counter-input-label>${textMessages.inputLabel}</label>
          <button type="button" class="tool-action text-counter-clear" data-text-counter-clear>${textMessages.clearAction}</button>
        </div>
        <textarea
          id="text-counter-input"
          class="tool-textarea text-counter-input"
          data-text-counter-input
          rows="12"
          spellcheck="false"
          placeholder="${textMessages.inputPlaceholder}"
        >${state.inputValue}</textarea>
      </form>

      <section class="tool-panel text-counter-panel">
        <h2 data-text-counter-results-label>${textMessages.resultsTitle}</h2>
        <div class="text-counter-grid" data-text-counter-results>
          ${statRows}
        </div>
      </section>
    </section>
  `
}
