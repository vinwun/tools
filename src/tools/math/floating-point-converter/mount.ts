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
  formatNumber,
  formatValueWithDelta,
  isTransientDecimalInput,
  parseDecimalInput,
} from './utils.ts'

const floatingPointConverterLocaleSyncers = new WeakMap<HTMLElement, (messages: Messages) => void>()

const getInterpretationLabel = (messages: Messages, key: string): string => {
  const lookup: Record<string, string> = {
    zero: messages.floatingPointConverter.interpretationZero,
    subnormal: messages.floatingPointConverter.interpretationSubnormal,
    normal: messages.floatingPointConverter.interpretationNormal,
    infinity: messages.floatingPointConverter.interpretationInfinity,
    nan: messages.floatingPointConverter.interpretationNaN,
  }

  return lookup[key] ?? key
}

const queryFormatElements = (
  container: HTMLElement,
  formatId: FloatingPointFormatId,
): FloatingPointFormatElements | null => {
  const signInput = container.querySelector<HTMLInputElement>(`[data-floating-point-sign="${formatId}"]`)
  const exponentInput = container.querySelector<HTMLInputElement>(
    `[data-floating-point-exponent="${formatId}"]`,
  )
  const mantissaInput = container.querySelector<HTMLInputElement>(
    `[data-floating-point-mantissa="${formatId}"]`,
  )
  const title = container.querySelector<HTMLElement>(`[data-floating-point-format-title="${formatId}"]`)
  const signLabel = container.querySelector<HTMLElement>(`[data-floating-point-sign-label="${formatId}"]`)
  const exponentLabel = container.querySelector<HTMLElement>(
    `[data-floating-point-exponent-label="${formatId}"]`,
  )
  const mantissaLabel = container.querySelector<HTMLElement>(
    `[data-floating-point-mantissa-label="${formatId}"]`,
  )
  const valueLabel = container.querySelector<HTMLElement>(`[data-floating-point-value-label="${formatId}"]`)
  const deltaLabel = container.querySelector<HTMLElement>(`[data-floating-point-delta-label="${formatId}"]`)
  const interpretationLabel = container.querySelector<HTMLElement>(
    `[data-floating-point-interpretation-label="${formatId}"]`,
  )
  const valueText = container.querySelector<HTMLElement>(`[data-floating-point-value="${formatId}"]`)
  const deltaText = container.querySelector<HTMLElement>(`[data-floating-point-delta="${formatId}"]`)
  const interpretationText = container.querySelector<HTMLElement>(
    `[data-floating-point-interpretation="${formatId}"]`,
  )

  if (
    !signInput ||
    !exponentInput ||
    !mantissaInput ||
    !title ||
    !signLabel ||
    !exponentLabel ||
    !mantissaLabel ||
    !valueLabel ||
    !deltaLabel ||
    !interpretationLabel ||
    !valueText ||
    !deltaText ||
    !interpretationText
  ) {
    return null
  }

  return {
    signInput,
    exponentInput,
    mantissaInput,
    title,
    signLabel,
    exponentLabel,
    mantissaLabel,
    valueLabel,
    deltaLabel,
    interpretationLabel,
    valueText,
    deltaText,
    interpretationText,
  }
}

const queryFloatingPointConverterElements = (
  container: HTMLElement,
): FloatingPointConverterElements | null => {
  const decimalInput = container.querySelector<HTMLInputElement>('[data-floating-point-decimal]')
  const decimalLabel = container.querySelector<HTMLElement>('[data-floating-point-decimal-label]')

  if (!decimalInput || !decimalLabel) {
    return null
  }

  const formats = Object.fromEntries(
    FLOATING_POINT_FORMATS.map((format) => [format.id, queryFormatElements(container, format.id)]),
  ) as Record<FloatingPointFormatId, FloatingPointFormatElements | null>

  if (Object.values(formats).some((format) => format === null)) {
    return null
  }

  return {
    decimalInput,
    decimalLabel,
    formats: formats as Record<FloatingPointFormatId, FloatingPointFormatElements>,
  }
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
  const formatElements = elements.formats[formatId]
  const formatState = state.formats[formatId]

  formatElements.signInput.value = formatState.sign
  formatElements.exponentInput.value = formatState.exponent
  formatElements.mantissaInput.value = formatState.mantissa
  formatElements.valueText.textContent = formatValueWithDelta(decimalNumber, formatState.value)
  formatElements.deltaText.textContent = formatDelta(decimalNumber, formatState.value)
  formatElements.interpretationText.textContent = getInterpretationLabel(
    messages,
    formatState.interpretation,
  )
}

export const mountFloatingPointConverter = (container: HTMLElement, initialMessages: Messages): void => {
  const root = container.querySelector<HTMLElement>('[data-floating-point-converter-root]') ?? container
  const elements = queryFloatingPointConverterElements(container)
  if (!elements) {
    return
  }

  const existingSyncLocale = floatingPointConverterLocaleSyncers.get(root)
  if (existingSyncLocale) {
    existingSyncLocale(initialMessages)
    return
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
    elements.decimalInput.value = state.decimalValue
    for (const format of FLOATING_POINT_FORMATS) {
      updateFormatOutputs(elements, messages, decimalNumber, format.id, state)
    }
  }

  const syncLocale = (nextMessages: Messages): void => {
    messages = nextMessages
    syncUi()
  }

  floatingPointConverterLocaleSyncers.set(root, syncLocale)

  const updateAllFromDecimalValue = (value: number): void => {
    decimalNumber = value
    state.decimalNumber = value
    state.decimalValue = formatNumber(value)
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
}

export const updateFloatingPointConverterLocale = (container: HTMLElement, messages: Messages): void => {
  const root = container.querySelector<HTMLElement>('[data-floating-point-converter-root]') ?? container
  floatingPointConverterLocaleSyncers.get(root)?.(messages)
}
