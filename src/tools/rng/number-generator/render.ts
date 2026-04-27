import type { Messages } from '../../../i18n/schema.ts'
import type { NumberGeneratorState } from './types.ts'

export const renderNumberGenerator = (messages: Messages, state: NumberGeneratorState): string => {
  const numberMessages = messages.rngNumberGenerator

  return `
    <section class="tool-layout rng-number-generator-layout" data-rng-number-generator-root>
      <form class="tool-panel rng-number-generator-panel" data-rng-number-generator-form novalidate>
        <output class="rng-number-generator-result" data-rng-number-generator-result aria-live="polite">${state.resultText}</output>
        <fieldset class="rng-number-generator-fieldset">
          <legend data-rng-number-generator-settings-legend>${numberMessages.settingsLegend}</legend>
          <div class="rng-number-generator-grid">
            <label class="tool-field" for="rng-number-generator-min">
              <span data-rng-number-generator-min-label>${numberMessages.minLabel}</span>
              <input id="rng-number-generator-min" data-rng-number-generator-min type="number" inputmode="decimal" step="any" value="${state.minValue}" />
            </label>
            <label class="tool-field" for="rng-number-generator-max">
              <span data-rng-number-generator-max-label>${numberMessages.maxLabel}</span>
              <input id="rng-number-generator-max" data-rng-number-generator-max type="number" inputmode="decimal" step="any" value="${state.maxValue}" />
            </label>
          </div>

          <button type="button" class="tool-action rng-number-generator-generate" data-rng-number-generator-generate>${numberMessages.generateAction}</button>

          <div class="rng-number-generator-mode-options">
            <label class="rng-number-generator-mode-option">
              <input type="radio" name="rng-number-generator-mode" value="integer" data-rng-number-generator-mode ${state.mode === 'integer' ? 'checked' : ''} />
              <span data-rng-number-generator-integer-label>${numberMessages.integerModeLabel}</span>
            </label>
            <label class="rng-number-generator-mode-option">
              <input type="radio" name="rng-number-generator-mode" value="decimal" data-rng-number-generator-mode ${state.mode === 'decimal' ? 'checked' : ''} />
              <span data-rng-number-generator-decimal-label>${numberMessages.decimalModeLabel}</span>
            </label>
          </div>
        </fieldset>
      </form>
    </section>
  `
}
