import type { Messages } from '../../../i18n/schema.ts'
import type { PrimeFactorizerState } from './types.ts'

export const renderPrimeFactorizer = (messages: Messages, state: PrimeFactorizerState): string => {
  const primeMessages = messages.primeFactorizer
  const fields = [
    {
      key: 'decimal',
      label: primeMessages.decimalLabel,
      hint: primeMessages.decimalHint,
      value: state.decimalValue,
      inputMode: 'numeric',
    },
    {
      key: 'expanded',
      label: primeMessages.expandedLabel,
      hint: primeMessages.expandedHint,
      value: state.expandedValue,
      inputMode: 'text',
    },
    {
      key: 'exponent',
      label: primeMessages.exponentLabel,
      hint: primeMessages.exponentHint,
      value: state.exponentValue,
      inputMode: 'text',
    },
  ]

  return `
    <section class="tool-layout prime-factorizer-layout" data-prime-factorizer-root>
      <div class="tool-panel prime-factorizer-panel">
        ${fields
          .map(
            ({ key, label, hint, value, inputMode }) => `
        <label class="tool-field" for="prime-factorizer-${key}">
          <span data-prime-factorizer-${key}-label>${label}</span>
          <input
            id="prime-factorizer-${key}"
            data-prime-factorizer-${key}
            type="text"
            inputmode="${inputMode}"
            spellcheck="false"
            value="${value}"
          />
        </label>
        <p class="tool-hint" data-prime-factorizer-${key}-hint>${hint}</p>`,
          )
          .join('')}
      </div>
    </section>
  `
}
