import type { Messages } from '../../../i18n/schema.ts'
import type {
  FloatingPointFormatElements,
  FloatingPointFormatId,
  FloatingPointConverterElements,
  FloatingPointConverterState,
} from './types.ts'
import {
  FLOATING_POINT_FORMATS,
  buildFormatDisplayFromInputs,
  buildFormatDisplayFromNumber,
  createInitialFloatingPointConverterState,
  formatDelta,
  localizeDecimalNumber,
  formatValueWithDelta,
  isTransientDecimalInput,
  parseDecimalInput,
  getInterpretationLabel,
} from './utils.ts'
import { queryRequired } from '../../foundations/dom.ts'
import type { MountTool } from '../../types.ts'
import { resolveNumberLocale } from '../../foundations/numbers.ts'

const queryFormatElements = (
  container: HTMLElement,
  formatId: FloatingPointFormatId,
): FloatingPointFormatElements | null =>
  queryRequired<FloatingPointFormatElements>(container, {
    signInput: `[data-floating-point-sign="${formatId}"]`,
    exponentInput: `[data-floating-point-exponent="${formatId}"]`,
    mantissaInput: `[data-floating-point-mantissa="${formatId}"]`,
    title: `[data-floating-point-format-title="${formatId}"]`,
    signLabel: `[data-floating-point-sign-label="${formatId}"]`,
    exponentLabel: `[data-floating-point-exponent-label="${formatId}"]`,
    mantissaLabel: `[data-floating-point-mantissa-label="${formatId}"]`,
    valueLabel: `[data-floating-point-value-label="${formatId}"]`,
    deltaLabel: `[data-floating-point-delta-label="${formatId}"]`,
    interpretationLabel: `[data-floating-point-interpretation-label="${formatId}"]`,
    valueText: `[data-floating-point-value="${formatId}"]`,
    deltaText: `[data-floating-point-delta="${formatId}"]`,
    interpretationText: `[data-floating-point-interpretation="${formatId}"]`,
  })

const queryFloatingPointConverterElements = (
  container: HTMLElement,
): FloatingPointConverterElements | null => {
  const decimalElements = queryRequired<Omit<FloatingPointConverterElements, 'formats'>>(container, {
    decimalInput: '[data-floating-point-decimal]',
    decimalLabel: '[data-floating-point-decimal-label]',
  })
  if (!decimalElements) {
    return null
  }

  const formats: Partial<FloatingPointConverterElements['formats']> = {}
  for (const format of FLOATING_POINT_FORMATS) {
    const formatElements = queryFormatElements(container, format.id)
    if (!formatElements) {
      return null
    }
    formats[format.id] = formatElements
  }

  return { ...decimalElements, formats: formats as FloatingPointConverterElements['formats'] }
}

const syncLocalizedText = (elements: FloatingPointConverterElements, messages: Messages): void => {
  const fpMessages = messages.floatingPointConverter
  elements.decimalLabel.textContent = fpMessages.decimalLabel

  const titles: Record<FloatingPointFormatId, string> = {
    half: fpMessages.formatHalfTitle,
    float: fpMessages.formatFloatTitle,
    double: fpMessages.formatDoubleTitle,
  }

  for (const format of FLOATING_POINT_FORMATS) {
    const formatElements = elements.formats[format.id]
    formatElements.title.textContent = titles[format.id]
    formatElements.signLabel.textContent = fpMessages.signLabel
    formatElements.exponentLabel.textContent = fpMessages.exponentLabel
    formatElements.mantissaLabel.textContent = fpMessages.mantissaLabel
    formatElements.valueLabel.textContent = fpMessages.valueLabel
    formatElements.deltaLabel.textContent = fpMessages.deltaLabel
    formatElements.interpretationLabel.textContent = fpMessages.interpretationLabel
  }
}

const updateFormatOutputs = (
  elements: FloatingPointConverterElements,
  messages: Messages,
  decimalNumber: number,
  formatId: FloatingPointFormatId,
  state: FloatingPointConverterState,
): void => {
  const locale = resolveNumberLocale()
  const formatElements = elements.formats[formatId]
  const formatState = state.formats[formatId]

  formatElements.signInput.value = formatState.sign
  formatElements.exponentInput.value = formatState.exponent
  formatElements.mantissaInput.value = formatState.mantissa
  formatElements.valueText.textContent = formatValueWithDelta(decimalNumber, formatState.value, locale)
  formatElements.deltaText.textContent = formatDelta(decimalNumber, formatState.value, locale)
  formatElements.interpretationText.textContent = getInterpretationLabel(
    messages,
    formatState.interpretation,
  )
}

export const mountFloatingPointConverter: MountTool = (container, initialMessages) => {
  const elements = queryFloatingPointConverterElements(container)
  if (!elements) {
    return {}
  }

  let messages = initialMessages
  const state = createInitialFloatingPointConverterState()
  let decimalNumber = state.decimalNumber
  let lastValidDecimal = state.decimalValue
  let lastValidFormats = Object.fromEntries(
    FLOATING_POINT_FORMATS.map((format) => [
      format.id,
      {
        sign: state.formats[format.id].sign,
        exponent: state.formats[format.id].exponent,
        mantissa: state.formats[format.id].mantissa,
      },
    ]),
  ) as Record<FloatingPointFormatId, { sign: string; exponent: string; mantissa: string }>

  const syncUi = (): void => {
    syncLocalizedText(elements, messages)
    // The field holds the previous locale's separator, so re-derive it from the parsed number.
    state.decimalValue = localizeDecimalNumber(decimalNumber, resolveNumberLocale())
    lastValidDecimal = state.decimalValue
    elements.decimalInput.value = state.decimalValue
    for (const format of FLOATING_POINT_FORMATS) {
      updateFormatOutputs(elements, messages, decimalNumber, format.id, state)
    }
  }

  const syncLocale = (nextMessages: Messages): void => {
    messages = nextMessages
    syncUi()
  }

  const updateAllFromDecimalValue = (value: number): void => {
    decimalNumber = value
    state.decimalNumber = value
    state.decimalValue = localizeDecimalNumber(value, resolveNumberLocale())
    elements.decimalInput.value = state.decimalValue

    for (const format of FLOATING_POINT_FORMATS) {
      state.formats[format.id] = buildFormatDisplayFromNumber(format, value)
      updateFormatOutputs(elements, messages, decimalNumber, format.id, state)
    }
  }

  const updateLastValid = (): void => {
    lastValidDecimal = state.decimalValue
    lastValidFormats = Object.fromEntries(
      FLOATING_POINT_FORMATS.map((format) => [
        format.id,
        {
          sign: state.formats[format.id].sign,
          exponent: state.formats[format.id].exponent,
          mantissa: state.formats[format.id].mantissa,
        },
      ]),
    ) as Record<FloatingPointFormatId, { sign: string; exponent: string; mantissa: string }>
  }

  const handleDecimalInput = (): void => {
    state.decimalValue = elements.decimalInput.value
    if (isTransientDecimalInput(state.decimalValue)) {
      return
    }
    const parsed = parseDecimalInput(state.decimalValue)
    if (parsed === null) {
      return
    }

    updateAllFromDecimalValue(parsed)
    updateLastValid()
  }

  const handleFormatInput = (formatId: FloatingPointFormatId): void => {
    const formatElements = elements.formats[formatId]
    const format = FLOATING_POINT_FORMATS.find((entry) => entry.id === formatId)
    if (!format) {
      return
    }

    const display = buildFormatDisplayFromInputs(
      format,
      formatElements.signInput.value,
      formatElements.exponentInput.value,
      formatElements.mantissaInput.value,
    )

    if (!display) {
      return
    }

    updateAllFromDecimalValue(display.value)
    state.formats[formatId] = display
    updateFormatOutputs(elements, messages, decimalNumber, formatId, state)
    updateLastValid()
  }

  const revertDecimalIfInvalid = (): void => {
    if (isTransientDecimalInput(elements.decimalInput.value)) {
      const parsed = parseDecimalInput(elements.decimalInput.value)
      if (parsed !== null) {
        updateAllFromDecimalValue(parsed)
        updateLastValid()
      }
      return
    }
    if (parseDecimalInput(elements.decimalInput.value) !== null) {
      return
    }

    state.decimalValue = lastValidDecimal
    elements.decimalInput.value = lastValidDecimal
  }

  const revertFormatIfInvalid = (formatId: FloatingPointFormatId): void => {
    const formatElements = elements.formats[formatId]
    const format = FLOATING_POINT_FORMATS.find((entry) => entry.id === formatId)
    if (!format) {
      return
    }

    const display = buildFormatDisplayFromInputs(
      format,
      formatElements.signInput.value,
      formatElements.exponentInput.value,
      formatElements.mantissaInput.value,
    )

    if (display) {
      return
    }

    const lastValid = lastValidFormats[formatId]
    formatElements.signInput.value = lastValid.sign
    formatElements.exponentInput.value = lastValid.exponent
    formatElements.mantissaInput.value = lastValid.mantissa
    updateFormatOutputs(elements, messages, decimalNumber, formatId, state)
  }

  elements.decimalInput.addEventListener('input', handleDecimalInput)
  elements.decimalInput.addEventListener('blur', revertDecimalIfInvalid)

  for (const format of FLOATING_POINT_FORMATS) {
    const formatElements = elements.formats[format.id]
    const handler = () => handleFormatInput(format.id)
    const revert = () => revertFormatIfInvalid(format.id)

    formatElements.signInput.addEventListener('input', handler)
    formatElements.exponentInput.addEventListener('input', handler)
    formatElements.mantissaInput.addEventListener('input', handler)

    formatElements.signInput.addEventListener('blur', revert)
    formatElements.exponentInput.addEventListener('blur', revert)
    formatElements.mantissaInput.addEventListener('blur', revert)
  }

  syncUi()

  return { updateLocale: syncLocale }
}
