import type { Messages } from '../../../i18n/schema.ts'
import type { FloatingPointConverterState } from './types.ts'
import {
  FLOATING_POINT_FORMATS,
  createInitialFloatingPointConverterState,
  formatDelta,
  formatValueWithDelta,
  getInterpretationLabel,
} from './utils.ts'
import { resolveNumberLocale } from '../../foundations/numbers.ts'

export const renderFloatingPointConverter = (
  messages: Messages,
  state: FloatingPointConverterState = createInitialFloatingPointConverterState(),
): string => {
  const fpMessages = messages.floatingPointConverter
  const locale = resolveNumberLocale()
  const titles = {
    half: fpMessages.formatHalfTitle,
    float: fpMessages.formatFloatTitle,
    double: fpMessages.formatDoubleTitle,
  }

  const formatCards = FLOATING_POINT_FORMATS.map((format) => {
    const formatState = state.formats[format.id]
    const valueText = formatValueWithDelta(state.decimalNumber, formatState.value, locale)
    const deltaText = formatDelta(state.decimalNumber, formatState.value, locale)
    const interpretationText = getInterpretationLabel(messages, formatState.interpretation)

    return `
      <article class="tool-panel floating-point-card" data-floating-point-format="${format.id}">
        <h2 data-floating-point-format-title="${format.id}">${titles[format.id]}</h2>
        <div class="floating-point-fields">
          ${[
            { part: 'sign', label: fpMessages.signLabel, maxLength: 1, value: formatState.sign },
            { part: 'exponent', label: fpMessages.exponentLabel, maxLength: format.exponentBits, value: formatState.exponent },
            { part: 'mantissa', label: fpMessages.mantissaLabel, maxLength: format.mantissaBits, value: formatState.mantissa },
          ]
            .map(
              ({ part, label, maxLength, value }) => `
          <label class="tool-field" for="floating-point-${format.id}-${part}">
            <span data-floating-point-${part}-label="${format.id}">${label}</span>
            <input
              id="floating-point-${format.id}-${part}"
              data-floating-point-${part}="${format.id}"
              type="text"
              inputmode="numeric"
              spellcheck="false"
              maxlength="${maxLength}"
              value="${value}"
            />
          </label>`,
            )
            .join('')}
        </div>
        <div class="floating-point-metrics">
          <div class="floating-point-metric">
            <span class="floating-point-metric-label" data-floating-point-value-label="${format.id}">${fpMessages.valueLabel}</span>
            <span class="floating-point-metric-value" data-floating-point-value="${format.id}">${valueText}</span>
            <div class="floating-point-metric-sub">
              <span class="floating-point-metric-label" data-floating-point-delta-label="${format.id}">${fpMessages.deltaLabel}</span>
              <span class="floating-point-metric-value" data-floating-point-delta="${format.id}">${deltaText}</span>
            </div>
            <div class="floating-point-metric-sub">
              <span class="floating-point-metric-label" data-floating-point-interpretation-label="${format.id}">${fpMessages.interpretationLabel}</span>
              <span class="floating-point-metric-value" data-floating-point-interpretation="${format.id}">${interpretationText}</span>
            </div>
          </div>
        </div>
      </article>
    `
  }).join('')

  return `
    <section class="tool-layout floating-point-converter-layout" data-floating-point-converter-root>
      <div class="tool-panel floating-point-converter-panel">
        <label class="tool-field" for="floating-point-decimal">
          <span data-floating-point-decimal-label>${fpMessages.decimalLabel}</span>
          <input
            id="floating-point-decimal"
            data-floating-point-decimal
            type="text"
            inputmode="decimal"
            spellcheck="false"
            value="${state.decimalValue}"
          />
        </label>
      </div>
      <div class="floating-point-grid">
        ${formatCards}
      </div>
    </section>
  `
}
