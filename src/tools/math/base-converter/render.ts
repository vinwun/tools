import type { Messages } from '../../../i18n/schema.ts'
import type { BaseConverterState } from './types.ts'

export const renderBaseConverter = (messages: Messages, state: BaseConverterState): string => {
  const baseMessages = messages.baseConverter
  const fields = [
    { key: 'binary', label: baseMessages.binaryLabel, value: state.binaryValue, inputMode: 'text' },
    { key: 'octal', label: baseMessages.octalLabel, value: state.octalValue, inputMode: 'text' },
    { key: 'decimal', label: baseMessages.decimalLabel, value: state.decimalValue, inputMode: 'numeric' },
    { key: 'hex', label: baseMessages.hexLabel, value: state.hexValue, inputMode: 'text' },
  ]

  const renderField = ({
    key,
    label,
    value,
    inputMode,
  }: (typeof fields)[number]): string => `
        <label class="tool-field" for="base-converter-${key}">
          <span data-base-converter-${key}-label>${label}</span>
          <input
            id="base-converter-${key}"
            data-base-converter-${key}
            type="text"
            inputmode="${inputMode}"
            spellcheck="false"
            value="${value}"
          />
        </label>`

  return `
    <section class="tool-layout base-converter-layout" data-base-converter-root>
      <div class="tool-panel base-converter-panel">
        ${fields.map(renderField).join('')}

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

        ${renderField({ key: 'roman', label: baseMessages.romanLabel, value: state.romanValue, inputMode: 'text' })}
      </div>
    </section>
  `
}
