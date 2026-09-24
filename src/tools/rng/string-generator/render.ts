import type { Messages } from '../../../i18n/schema.ts'
import type { StringGeneratorState } from './types.ts'
import { escapeHtml } from '../../foundations/dom.ts'
import {
  createInitialStringGeneratorState,
  formatStringGeneratorStatus,
  parseStringGeneratorEntries,
} from './utils.ts'

export const renderStringGenerator = (
  messages: Messages,
  state: StringGeneratorState = createInitialStringGeneratorState(),
): string => {
  const stringMessages = messages.rngStringGenerator
  const entries = parseStringGeneratorEntries(state.entriesText)
  const statusText = formatStringGeneratorStatus(
    messages,
    entries.length,
    state.uniqueMode,
    state.availableEntryIndices.length,
  )

  return `
    <section class="tool-layout rng-string-generator-layout" data-rng-string-generator-root>
      <div class="rng-string-generator-result-shell">
        <output class="tool-readout rng-string-generator-result" data-rng-string-generator-result aria-live="polite">${escapeHtml(state.resultText)}</output>
        <p class="tool-status rng-string-generator-status" role="status" data-rng-string-generator-status>${escapeHtml(statusText)}</p>
      </div>

      <form class="tool-panel rng-string-generator-panel" data-rng-string-generator-form novalidate>
        <div class="rng-string-generator-columns">
          <div class="rng-string-generator-list-column">
            <fieldset class="rng-string-generator-fieldset rng-string-generator-list-fieldset">
              <legend data-rng-string-generator-list-legend>${escapeHtml(stringMessages.listLegend)}</legend>
              <div class="tool-field rng-string-generator-list-field">
                <textarea
                  id="rng-string-generator-entries"
                  data-rng-string-generator-entries
                  aria-label="${escapeHtml(stringMessages.listLegend)}"
                  rows="5"
                >${escapeHtml(state.entriesText)}</textarea>
              </div>
              <p class="tool-hint rng-string-generator-hint" data-rng-string-generator-list-hint>${escapeHtml(stringMessages.listHint)}</p>
            </fieldset>
          </div>

          <div class="rng-string-generator-options-column">
            <fieldset class="rng-string-generator-fieldset">
              <legend data-rng-string-generator-options-legend>${escapeHtml(stringMessages.optionsLegend)}</legend>
              <p class="tool-hint rng-string-generator-hint rng-string-generator-options-hint" data-rng-string-generator-unique-hint>${escapeHtml(stringMessages.uniqueModeHint)}</p>
              <div class="rng-string-generator-options-row">
                <label class="rng-string-generator-toggle">
                  <input type="checkbox" data-rng-string-generator-unique-mode ${state.uniqueMode ? 'checked' : ''} />
                  <span data-rng-string-generator-unique-label>${escapeHtml(stringMessages.uniqueModeLabel)}</span>
                </label>
                <button type="button" class="tool-action rng-string-generator-reset" data-rng-string-generator-reset>${escapeHtml(stringMessages.resetAction)}</button>
              </div>
            </fieldset>

            <div class="tool-actions rng-string-generator-actions">
              <button type="submit" class="tool-action rng-string-generator-generate" data-rng-string-generator-generate>${escapeHtml(stringMessages.generateAction)}</button>
            </div>
          </div>
        </div>
      </form>
    </section>
  `
}
