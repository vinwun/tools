import type { Messages } from '../../../i18n/schema.ts'
import type { AspectRatioCalculatorState } from './types.ts'

export const renderAspectRatioCalculator = (
  messages: Messages,
  state: AspectRatioCalculatorState,
): string => {
  const ratioMessages = messages.aspectRatioCalculator

  return `
    <section class="tool-layout aspect-ratio-calculator-layout" data-aspect-ratio-calculator-root>
      <div class="tool-panel aspect-ratio-calculator-panel aspect-ratio-calculator-input-panel">
        <div class="aspect-ratio-calculator-inputs">
          <label class="tool-field" for="aspect-ratio-calculator-width">
            <span data-aspect-ratio-calculator-width-label>${ratioMessages.widthLabel}</span>
            <input
              id="aspect-ratio-calculator-width"
              data-aspect-ratio-calculator-width
              type="text"
              inputmode="decimal"
              spellcheck="false"
              value="${state.widthValue}"
            />
          </label>
          <label class="tool-field" for="aspect-ratio-calculator-height">
            <span data-aspect-ratio-calculator-height-label>${ratioMessages.heightLabel}</span>
            <input
              id="aspect-ratio-calculator-height"
              data-aspect-ratio-calculator-height
              type="text"
              inputmode="decimal"
              spellcheck="false"
              value="${state.heightValue}"
            />
          </label>
        </div>
      </div>

      <div class="tool-panel aspect-ratio-calculator-panel aspect-ratio-calculator-output-panel">
        <div class="aspect-ratio-calculator-results">
          <label class="tool-field">
            <span data-aspect-ratio-calculator-reduced-label>${ratioMessages.reducedLabel}</span>
            <output class="aspect-ratio-calculator-output" data-aspect-ratio-calculator-reduced>${state.reducedText}</output>
          </label>
          <label class="tool-field">
            <span data-aspect-ratio-calculator-decimal-label>${ratioMessages.decimalLabel}</span>
            <output class="aspect-ratio-calculator-output" data-aspect-ratio-calculator-decimal>${state.decimalText}</output>
          </label>
        </div>
      </div>
    </section>
  `
}
