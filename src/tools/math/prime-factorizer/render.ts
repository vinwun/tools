import type { Messages } from '../../../i18n/schema.ts'
import type { PrimeFactorizerState } from './types.ts'

export const renderPrimeFactorizer = (messages: Messages, state: PrimeFactorizerState): string => {
  const primeMessages = messages.primeFactorizer

  return `
    <section class="tool-layout prime-factorizer-layout" data-prime-factorizer-root>
      <div class="tool-panel prime-factorizer-panel">
        <label class="tool-field" for="prime-factorizer-decimal">
          <span data-prime-factorizer-decimal-label>${primeMessages.decimalLabel}</span>
          <input
            id="prime-factorizer-decimal"
            data-prime-factorizer-decimal
            type="text"
            inputmode="numeric"
            spellcheck="false"
            value="${state.decimalValue}"
          />
        </label>
        <p class="tool-hint" data-prime-factorizer-decimal-hint>${primeMessages.decimalHint}</p>

        <label class="tool-field" for="prime-factorizer-expanded">
          <span data-prime-factorizer-expanded-label>${primeMessages.expandedLabel}</span>
          <input
            id="prime-factorizer-expanded"
            data-prime-factorizer-expanded
            type="text"
            inputmode="text"
            spellcheck="false"
            value="${state.expandedValue}"
          />
        </label>
        <p class="tool-hint" data-prime-factorizer-expanded-hint>${primeMessages.expandedHint}</p>

        <label class="tool-field" for="prime-factorizer-exponent">
          <span data-prime-factorizer-exponent-label>${primeMessages.exponentLabel}</span>
          <input
            id="prime-factorizer-exponent"
            data-prime-factorizer-exponent
            type="text"
            inputmode="text"
            spellcheck="false"
            value="${state.exponentValue}"
          />
        </label>
        <p class="tool-hint" data-prime-factorizer-exponent-hint>${primeMessages.exponentHint}</p>
      </div>
    </section>
  `
}
