import type { Messages } from '../../../i18n/schema.ts'
import type {
  BaseConverterElements,
  BaseConverterField,
  BaseConverterState,
} from './types.ts'
import {
  clampBaseInput,
  createInitialBaseConverterState,
  formatValueInBase,
  formatRomanValue,
  parseBaseInput,
  parseRomanInput,
  parseValueInBase,
} from './utils.ts'
import { createLocaleSyncRegistry } from '../../foundations/locale-sync.ts'

const baseConverterLocale = createLocaleSyncRegistry<[Messages]>('[data-base-converter-root]')

const queryBaseConverterElements = (container: HTMLElement): BaseConverterElements | null => {
  const binaryInput = container.querySelector<HTMLInputElement>('[data-base-converter-binary]')
  const octalInput = container.querySelector<HTMLInputElement>('[data-base-converter-octal]')
  const decimalInput = container.querySelector<HTMLInputElement>('[data-base-converter-decimal]')
  const hexInput = container.querySelector<HTMLInputElement>('[data-base-converter-hex]')
  const customBaseInput = container.querySelector<HTMLInputElement>('[data-base-converter-custom-base]')
  const customValueInput = container.querySelector<HTMLInputElement>('[data-base-converter-custom-value]')
  const romanInput = container.querySelector<HTMLInputElement>('[data-base-converter-roman]')
  const binaryLabel = container.querySelector<HTMLElement>('[data-base-converter-binary-label]')
  const octalLabel = container.querySelector<HTMLElement>('[data-base-converter-octal-label]')
  const decimalLabel = container.querySelector<HTMLElement>('[data-base-converter-decimal-label]')
  const hexLabel = container.querySelector<HTMLElement>('[data-base-converter-hex-label]')
  const customBaseLabel = container.querySelector<HTMLElement>('[data-base-converter-custom-base-label]')
  const customValueLabel = container.querySelector<HTMLElement>('[data-base-converter-custom-value-label]')
  const romanLabel = container.querySelector<HTMLElement>('[data-base-converter-roman-label]')

  if (
    !binaryInput ||
    !octalInput ||
    !decimalInput ||
    !hexInput ||
    !customBaseInput ||
    !customValueInput ||
    !romanInput ||
    !binaryLabel ||
    !octalLabel ||
    !decimalLabel ||
    !hexLabel ||
    !customBaseLabel ||
    !customValueLabel ||
    !romanLabel
  ) {
    return null
  }

  return {
    binaryInput,
    octalInput,
    decimalInput,
    hexInput,
    customBaseInput,
    customValueInput,
    romanInput,
    binaryLabel,
    octalLabel,
    decimalLabel,
    hexLabel,
    customBaseLabel,
    customValueLabel,
    romanLabel,
  }
}

const syncLocalizedText = (elements: BaseConverterElements, messages: Messages): void => {
  const baseMessages = messages.baseConverter
  elements.binaryLabel.textContent = baseMessages.binaryLabel
  elements.octalLabel.textContent = baseMessages.octalLabel
  elements.decimalLabel.textContent = baseMessages.decimalLabel
  elements.hexLabel.textContent = baseMessages.hexLabel
  elements.customBaseLabel.textContent = baseMessages.customBaseLabel
  elements.customValueLabel.textContent = baseMessages.customValueLabel
  elements.romanLabel.textContent = baseMessages.romanLabel
}

const updateOutputs = (
  elements: BaseConverterElements,
  state: BaseConverterState,
  value: bigint,
  source: BaseConverterField,
): void => {
  state.numericValue = value

  if (source !== 'binary') {
    state.binaryValue = formatValueInBase(value, 2)
    elements.binaryInput.value = state.binaryValue
  }

  if (source !== 'octal') {
    state.octalValue = formatValueInBase(value, 8)
    elements.octalInput.value = state.octalValue
  }

  if (source !== 'decimal') {
    state.decimalValue = formatValueInBase(value, 10)
    elements.decimalInput.value = state.decimalValue
  }

  if (source !== 'hex') {
    state.hexValue = formatValueInBase(value, 16)
    elements.hexInput.value = state.hexValue
  }

  if (source !== 'custom') {
    state.customValue = formatValueInBase(value, state.customBase)
    elements.customValueInput.value = state.customValue
  }

  if (source !== 'roman') {
    state.romanValue = formatRomanValue(value)
    elements.romanInput.value = state.romanValue
  }
}

export const mountBaseConverter = (container: HTMLElement, initialMessages: Messages): void => {
  const root = container.querySelector<HTMLElement>('[data-base-converter-root]') ?? container
  const elements = queryBaseConverterElements(container)
  if (!elements) {
    return
  }

  if (baseConverterLocale.resync(root, initialMessages)) {
    return
  }

  let messages = initialMessages
  const state = createInitialBaseConverterState()

  let lastValidBinary = state.binaryValue
  let lastValidOctal = state.octalValue
  let lastValidDecimal = state.decimalValue
  let lastValidHex = state.hexValue
  let lastValidCustomBase = state.customBaseValue
  let lastValidCustomValue = state.customValue
  let lastValidRoman = state.romanValue

  const syncUi = (): void => {
    syncLocalizedText(elements, messages)
    elements.binaryInput.value = state.binaryValue
    elements.octalInput.value = state.octalValue
    elements.decimalInput.value = state.decimalValue
    elements.hexInput.value = state.hexValue
    elements.customBaseInput.value = state.customBaseValue
    elements.customValueInput.value = state.customValue
    elements.romanInput.value = state.romanValue
  }

  const syncLocale = (nextMessages: Messages): void => {
    messages = nextMessages
    syncUi()
  }

  baseConverterLocale.register(root, syncLocale)

  const handleBinaryInput = (): void => {
    state.binaryValue = elements.binaryInput.value
    const parsedValue = parseValueInBase(state.binaryValue, 2)

    if (parsedValue === null) {
      return
    }

    updateOutputs(elements, state, parsedValue, 'binary')
    lastValidBinary = state.binaryValue
    lastValidOctal = state.octalValue
    lastValidDecimal = state.decimalValue
    lastValidHex = state.hexValue
    lastValidCustomValue = state.customValue
    lastValidRoman = state.romanValue
  }

  const handleOctalInput = (): void => {
    state.octalValue = elements.octalInput.value
    const parsedValue = parseValueInBase(state.octalValue, 8)

    if (parsedValue === null) {
      return
    }

    updateOutputs(elements, state, parsedValue, 'octal')
    lastValidBinary = state.binaryValue
    lastValidOctal = state.octalValue
    lastValidDecimal = state.decimalValue
    lastValidHex = state.hexValue
    lastValidCustomValue = state.customValue
    lastValidRoman = state.romanValue
  }

  const handleDecimalInput = (): void => {
    state.decimalValue = elements.decimalInput.value
    const parsedValue = parseValueInBase(state.decimalValue, 10)

    if (parsedValue === null) {
      return
    }

    updateOutputs(elements, state, parsedValue, 'decimal')
    lastValidBinary = state.binaryValue
    lastValidOctal = state.octalValue
    lastValidDecimal = state.decimalValue
    lastValidHex = state.hexValue
    lastValidCustomValue = state.customValue
    lastValidRoman = state.romanValue
  }

  const handleHexInput = (): void => {
    state.hexValue = elements.hexInput.value
    const parsedValue = parseValueInBase(state.hexValue, 16)

    if (parsedValue === null) {
      return
    }

    updateOutputs(elements, state, parsedValue, 'hex')
    lastValidBinary = state.binaryValue
    lastValidOctal = state.octalValue
    lastValidDecimal = state.decimalValue
    lastValidHex = state.hexValue
    lastValidCustomValue = state.customValue
    lastValidRoman = state.romanValue
  }

  const handleCustomValueInput = (): void => {
    state.customValue = elements.customValueInput.value
    const base = parseBaseInput(state.customBaseValue)
    if (base === null) {
      return
    }

    const parsedValue = parseValueInBase(state.customValue, base)
    if (parsedValue === null) {
      return
    }

    updateOutputs(elements, state, parsedValue, 'custom')
    lastValidBinary = state.binaryValue
    lastValidOctal = state.octalValue
    lastValidDecimal = state.decimalValue
    lastValidHex = state.hexValue
    lastValidCustomValue = state.customValue
    lastValidRoman = state.romanValue
  }

  const handleRomanInput = (): void => {
    state.romanValue = elements.romanInput.value
    const parsedValue = parseRomanInput(state.romanValue)

    if (parsedValue === null) {
      return
    }

    updateOutputs(elements, state, parsedValue, 'roman')
    lastValidBinary = state.binaryValue
    lastValidOctal = state.octalValue
    lastValidDecimal = state.decimalValue
    lastValidHex = state.hexValue
    lastValidCustomValue = state.customValue
    lastValidRoman = state.romanValue
  }

  const handleCustomBaseInput = (): void => {
    state.customBaseValue = elements.customBaseInput.value
    const clampedBase = clampBaseInput(state.customBaseValue)
    if (clampedBase === null) {
      return
    }

    state.customBase = clampedBase
    state.customBaseValue = String(clampedBase)
    elements.customBaseInput.value = state.customBaseValue
    state.customValue = formatValueInBase(state.numericValue, state.customBase)
    elements.customValueInput.value = state.customValue
    lastValidCustomBase = state.customBaseValue
    lastValidCustomValue = state.customValue
  }

  const revertCustomBaseIfInvalid = (): void => {
    const clampedBase = clampBaseInput(elements.customBaseInput.value)
    if (clampedBase === null) {
      state.customBaseValue = lastValidCustomBase
      elements.customBaseInput.value = lastValidCustomBase
      state.customBase = parseBaseInput(lastValidCustomBase) ?? state.customBase
      return
    }

    state.customBase = clampedBase
    state.customBaseValue = String(clampedBase)
    elements.customBaseInput.value = state.customBaseValue
    state.customValue = formatValueInBase(state.numericValue, state.customBase)
    elements.customValueInput.value = state.customValue
    lastValidCustomBase = state.customBaseValue
    lastValidCustomValue = state.customValue
  }

  const revertBinaryIfInvalid = (): void => {
    if (parseValueInBase(elements.binaryInput.value, 2) !== null) {
      return
    }

    state.binaryValue = lastValidBinary
    elements.binaryInput.value = lastValidBinary
  }

  const revertOctalIfInvalid = (): void => {
    if (parseValueInBase(elements.octalInput.value, 8) !== null) {
      return
    }

    state.octalValue = lastValidOctal
    elements.octalInput.value = lastValidOctal
  }

  const revertDecimalIfInvalid = (): void => {
    if (parseValueInBase(elements.decimalInput.value, 10) !== null) {
      return
    }

    state.decimalValue = lastValidDecimal
    elements.decimalInput.value = lastValidDecimal
  }

  const revertHexIfInvalid = (): void => {
    if (parseValueInBase(elements.hexInput.value, 16) !== null) {
      return
    }

    state.hexValue = lastValidHex
    elements.hexInput.value = lastValidHex
  }

  const revertCustomValueIfInvalid = (): void => {
    if (parseValueInBase(elements.customValueInput.value, state.customBase) !== null) {
      return
    }

    state.customValue = lastValidCustomValue
    elements.customValueInput.value = lastValidCustomValue
  }

  const revertRomanIfInvalid = (): void => {
    if (parseRomanInput(elements.romanInput.value) !== null) {
      return
    }

    state.romanValue = lastValidRoman
    elements.romanInput.value = lastValidRoman
  }

  elements.binaryInput.addEventListener('input', handleBinaryInput)
  elements.octalInput.addEventListener('input', handleOctalInput)
  elements.decimalInput.addEventListener('input', handleDecimalInput)
  elements.hexInput.addEventListener('input', handleHexInput)
  elements.customValueInput.addEventListener('input', handleCustomValueInput)
  elements.customBaseInput.addEventListener('input', handleCustomBaseInput)
  elements.romanInput.addEventListener('input', handleRomanInput)

  elements.binaryInput.addEventListener('blur', revertBinaryIfInvalid)
  elements.octalInput.addEventListener('blur', revertOctalIfInvalid)
  elements.decimalInput.addEventListener('blur', revertDecimalIfInvalid)
  elements.hexInput.addEventListener('blur', revertHexIfInvalid)
  elements.customBaseInput.addEventListener('blur', revertCustomBaseIfInvalid)
  elements.customValueInput.addEventListener('blur', revertCustomValueIfInvalid)
  elements.romanInput.addEventListener('blur', revertRomanIfInvalid)

  syncUi()
}

export const updateBaseConverterLocale = baseConverterLocale.update
