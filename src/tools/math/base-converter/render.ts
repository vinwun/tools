import type { Messages } from '../../../i18n/schema.ts'
import type { BaseConverterState } from './types.ts'

export const renderBaseConverter = (messages: Messages, state: BaseConverterState): string => {
  const baseMessages = messages.numericalConverter

  return `
    <section class="tool-layout base-converter-layout" data-base-converter-root>
      <div class="tool-panel base-converter-panel">
        <label class="tool-field" for="base-converter-binary">
          <span data-base-converter-binary-label>${baseMessages.binaryLabel}</span>
          <input
            id="base-converter-binary"
            data-base-converter-binary
            type="text"
            inputmode="text"
            spellcheck="false"
            value="${state.binaryValue}"
          />
        </label>

        <label class="tool-field" for="base-converter-octal">
          <span data-base-converter-octal-label>${baseMessages.octalLabel}</span>
          <input
            id="base-converter-octal"
            data-base-converter-octal
            type="text"
            inputmode="text"
            spellcheck="false"
            value="${state.octalValue}"
          />
        </label>

        <label class="tool-field" for="base-converter-decimal">
          <span data-base-converter-decimal-label>${baseMessages.decimalLabel}</span>
          <input
            id="base-converter-decimal"
            data-base-converter-decimal
            type="text"
            inputmode="numeric"
            spellcheck="false"
            value="${state.decimalValue}"
          />
        </label>

        <label class="tool-field" for="base-converter-hex">
          <span data-base-converter-hex-label>${baseMessages.hexLabel}</span>
          <input
            id="base-converter-hex"
            data-base-converter-hex
            type="text"
            inputmode="text"
            spellcheck="false"
            value="${state.hexValue}"
          />
        </label>

        <div class="base-converter-custom">
          <label class="tool-field base-converter-custom-base" for="base-converter-custom-base">
            <span data-base-converter-custom-base-label>${baseMessages.customBaseLabel}</span>
            <input
              id="base-converter-custom-base"
              data-base-converter-custom-base
              type="number"
              min="2"
              max="36"
              step="1"
              inputmode="numeric"
              value="${state.customBaseValue}"
            />
          </label>
          <label class="tool-field base-converter-custom-value" for="base-converter-custom-value">
            <span data-base-converter-custom-value-label>${baseMessages.customValueLabel}</span>
            <input
              id="base-converter-custom-value"
              data-base-converter-custom-value
              type="text"
              inputmode="text"
              spellcheck="false"
              value="${state.customValue}"
            />
          </label>
        </div>

        <label class="tool-field" for="base-converter-roman">
          <span data-base-converter-roman-label>${baseMessages.romanLabel}</span>
          <input
            id="base-converter-roman"
            data-base-converter-roman
            type="text"
            inputmode="text"
            spellcheck="false"
            value="${state.romanValue}"
          />
        </label>
      </div>
    </section>
  `
}
