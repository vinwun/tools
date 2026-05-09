import type { Messages } from '../../../i18n/schema.ts'
import type { FloatingPointInspectorState } from './types.ts'
import { FLOATING_POINT_FORMATS, formatDelta, formatValueWithDelta } from './utils.ts'

const getInterpretationLabel = (messages: Messages, key: string): string => {
  const lookup: Record<string, string> = {
    zero: messages.floatingPointInspector.interpretationZero,
    subnormal: messages.floatingPointInspector.interpretationSubnormal,
    normal: messages.floatingPointInspector.interpretationNormal,
    infinity: messages.floatingPointInspector.interpretationInfinity,
    nan: messages.floatingPointInspector.interpretationNaN,
  }

  return lookup[key] ?? key
}

export const renderFloatingPointInspector = (
  messages: Messages,
  state: FloatingPointInspectorState,
): string => {
  const fpMessages = messages.floatingPointInspector
  const titles = {
    half: fpMessages.formatHalfTitle,
    float: fpMessages.formatFloatTitle,
    double: fpMessages.formatDoubleTitle,
  }

  const formatCards = FLOATING_POINT_FORMATS.map((format) => {
    const formatState = state.formats[format.id]
    const valueText = formatValueWithDelta(state.decimalNumber, formatState.value)
    const deltaText = formatDelta(state.decimalNumber, formatState.value)
    const interpretationText = getInterpretationLabel(messages, formatState.interpretation)

    return `
      <article class="tool-panel floating-point-card" data-floating-point-format="${format.id}">
        <h2 data-floating-point-format-title="${format.id}">${titles[format.id]}</h2>
        <div class="floating-point-fields">
          <label class="tool-field" for="floating-point-${format.id}-sign">
            <span data-floating-point-sign-label="${format.id}">${fpMessages.signLabel}</span>
            <input
              id="floating-point-${format.id}-sign"
              data-floating-point-sign="${format.id}"
              type="text"
              inputmode="numeric"
              spellcheck="false"
              maxlength="1"
              value="${formatState.sign}"
            />
          </label>
          <label class="tool-field" for="floating-point-${format.id}-exponent">
            <span data-floating-point-exponent-label="${format.id}">${fpMessages.exponentLabel}</span>
            <input
              id="floating-point-${format.id}-exponent"
              data-floating-point-exponent="${format.id}"
              type="text"
              inputmode="numeric"
              spellcheck="false"
              maxlength="${format.exponentBits}"
              value="${formatState.exponent}"
            />
          </label>
          <label class="tool-field" for="floating-point-${format.id}-mantissa">
            <span data-floating-point-mantissa-label="${format.id}">${fpMessages.mantissaLabel}</span>
            <input
              id="floating-point-${format.id}-mantissa"
              data-floating-point-mantissa="${format.id}"
              type="text"
              inputmode="numeric"
              spellcheck="false"
              maxlength="${format.mantissaBits}"
              value="${formatState.mantissa}"
            />
          </label>
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
    <section class="tool-layout floating-point-inspector-layout" data-floating-point-inspector-root>
      <div class="tool-panel floating-point-inspector-panel">
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
