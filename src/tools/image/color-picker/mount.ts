import type { Messages } from '../../../i18n/schema'
import type { ColorPickerElements, ColorState, HSLColor, RGBColor } from './types.ts'
import {
  copyText,
  DEFAULT_COLOR,
  drawHueCanvas,
  drawSpectrumCanvas,
  formatMessage,
  getNormalizedPoint,
  getReadableTextColor,
  hexToRgb,
  hslToRgb,
  normalizeHexInput,
  readHslFromInputs,
  readRgbFromInputs,
  rgbToHex,
  rgbToHsl,
  round,
} from './utils.ts'

const colorPickerLocaleSyncers = new WeakMap<HTMLElement, (messages: Messages) => void>()

const queryColorPickerElements = (container: HTMLElement): ColorPickerElements | null => {
  const spectrumCanvas = container.querySelector<HTMLCanvasElement>('[data-color-picker-spectrum]')
  const spectrumHandle = container.querySelector<HTMLElement>('[data-color-picker-spectrum-handle]')
  const hueCanvas = container.querySelector<HTMLCanvasElement>('[data-color-picker-hue]')
  const hueHandle = container.querySelector<HTMLElement>('[data-color-picker-hue-handle]')
  const hexInput = container.querySelector<HTMLInputElement>('[data-color-picker-hex]')
  const hexCopyButton = container.querySelector<HTMLButtonElement>('[data-color-picker-copy]')
  const copyPopup = container.querySelector<HTMLElement>('[data-color-picker-popup]')
  const redInput = container.querySelector<HTMLInputElement>('[data-color-picker-r]')
  const greenInput = container.querySelector<HTMLInputElement>('[data-color-picker-g]')
  const blueInput = container.querySelector<HTMLInputElement>('[data-color-picker-b]')
  const hueInput = container.querySelector<HTMLInputElement>('[data-color-picker-h]')
  const saturationInput = container.querySelector<HTMLInputElement>('[data-color-picker-s]')
  const lightnessInput = container.querySelector<HTMLInputElement>('[data-color-picker-l]')

  if (
    !spectrumCanvas ||
    !spectrumHandle ||
    !hueCanvas ||
    !hueHandle ||
    !hexInput ||
    !hexCopyButton ||
    !copyPopup ||
    !redInput ||
    !greenInput ||
    !blueInput ||
    !hueInput ||
    !saturationInput ||
    !lightnessInput
  ) {
    return null
  }

  return {
    spectrumCanvas,
    spectrumHandle,
    hueCanvas,
    hueHandle,
    hexInput,
    hexCopyButton,
    copyPopup,
    redInput,
    greenInput,
    blueInput,
    hueInput,
    saturationInput,
    lightnessInput,
  }
}

export const mountColorPicker = (container: HTMLElement, initialMessages: Messages): void => {
  const root = container.querySelector<HTMLElement>('[data-color-picker-root]') ?? container
  const elements = queryColorPickerElements(container)
  if (!elements) {
    return
  }

  let messages = initialMessages
  let state: ColorState = {
    rgb: DEFAULT_COLOR,
    hsl: rgbToHsl(DEFAULT_COLOR),
  }

  let copyPopupTimer: number | undefined
  const dragSpectrum = { value: false }
  const dragHue = { value: false }

  const updateCanvasUI = (): void => {
    const hex = rgbToHex(state.rgb)

    elements.spectrumHandle.style.left = `${state.hsl.l}%`
    elements.spectrumHandle.style.top = `${100 - state.hsl.s}%`
    elements.hueHandle.style.left = '50%'
    elements.hueHandle.style.top = `${(state.hsl.h / 360) * 100}%`
    elements.hexCopyButton.textContent = messages.colorPicker.copyHexAction
    elements.hexCopyButton.style.setProperty('color', getReadableTextColor(state.rgb))
    elements.hexCopyButton.style.setProperty('background', hex)
  }

  const redrawCanvases = (): void => {
    drawSpectrumCanvas(elements.spectrumCanvas, state.hsl.h)
    drawHueCanvas(elements.hueCanvas)
    updateCanvasUI()
  }

  const syncInputs = (): void => {
    elements.hexInput.value = rgbToHex(state.rgb)
    elements.redInput.value = String(state.rgb.r)
    elements.greenInput.value = String(state.rgb.g)
    elements.blueInput.value = String(state.rgb.b)
    elements.hueInput.value = String(state.hsl.h)
    elements.saturationInput.value = String(state.hsl.s)
    elements.lightnessInput.value = String(state.hsl.l)
  }

  const syncAll = (): void => {
    syncInputs()
    redrawCanvases()
  }

  const syncLocalizedText = (): void => {
    const heading = root.querySelector<HTMLElement>('.color-picker-text-block h2')
    const hint = root.querySelector<HTMLElement>('.color-picker-hint')
    const legends = root.querySelectorAll<HTMLElement>('.color-picker-fieldset legend')
    const hexInputLabel = root.querySelector<HTMLElement>('.color-picker-hex-input-field > span')
    const rgbLabels = root.querySelectorAll<HTMLElement>('.color-picker-panel-right .color-picker-grid .tool-field > span')
    const copyButton = elements.hexCopyButton

    if (heading) heading.textContent = messages.colorPicker.squareLabel
    if (hint) hint.textContent = messages.colorPicker.squareHint
    if (legends[0]) legends[0].textContent = messages.colorPicker.hexLabel
    if (legends[1]) legends[1].textContent = messages.colorPicker.rgbGroupLabel
    if (legends[2]) legends[2].textContent = messages.colorPicker.hslGroupLabel
    if (hexInputLabel) hexInputLabel.textContent = messages.colorPicker.hexInputLabel
    if (rgbLabels[0]) rgbLabels[0].textContent = messages.colorPicker.redLabel
    if (rgbLabels[1]) rgbLabels[1].textContent = messages.colorPicker.greenLabel
    if (rgbLabels[2]) rgbLabels[2].textContent = messages.colorPicker.blueLabel
    if (rgbLabels[3]) rgbLabels[3].textContent = messages.colorPicker.hueLabel
    if (rgbLabels[4]) rgbLabels[4].textContent = messages.colorPicker.saturationLabel
    if (rgbLabels[5]) rgbLabels[5].textContent = messages.colorPicker.lightnessLabel
    copyButton.textContent = messages.colorPicker.copyHexAction
    elements.spectrumCanvas.setAttribute('aria-label', messages.colorPicker.squareLabel)
    elements.hueCanvas.setAttribute('aria-label', messages.colorPicker.hueBarLabel)
  }

  const syncLocale = (nextMessages: Messages): void => {
    messages = nextMessages
    syncLocalizedText()
    syncAll()
  }

  colorPickerLocaleSyncers.set(root, syncLocale)

  const setPopupMessage = (message: string): void => {
    if (copyPopupTimer !== undefined) {
      window.clearTimeout(copyPopupTimer)
    }

    elements.copyPopup.textContent = message
    elements.copyPopup.dataset.visible = 'true'

    copyPopupTimer = window.setTimeout(() => {
      elements.copyPopup.dataset.visible = 'false'
      elements.copyPopup.textContent = ''
    }, 1600)
  }

  const updateFromRgb = (rgb: RGBColor): void => {
    state = {
      rgb,
      hsl: rgbToHsl(rgb),
    }
    syncAll()
  }

  const updateFromHsl = (hsl: HSLColor): void => {
    state = {
      rgb: hslToRgb(hsl),
      hsl,
    }
    syncAll()
  }

  const updateFromHex = (value: string): void => {
    const rgb = hexToRgb(value)
    if (!rgb) {
      return
    }

    updateFromRgb(rgb)
  }

  const updateFromSpectrumPoint = (event: PointerEvent): void => {
    const { x, y } = getNormalizedPoint(elements.spectrumCanvas, event)
    const nextHsl: HSLColor = {
      h: state.hsl.h,
      s: round((1 - y) * 100),
      l: round(x * 100),
    }

    updateFromHsl(nextHsl)
  }

  const updateFromHuePoint = (event: PointerEvent): void => {
    const { y } = getNormalizedPoint(elements.hueCanvas, event)
    const nextHsl: HSLColor = {
      h: round(y * 360),
      s: state.hsl.s,
      l: state.hsl.l,
    }

    updateFromHsl(nextHsl)
  }

  const handlePointerDrag = (
    canvas: HTMLCanvasElement,
    isDraggingRef: { value: boolean },
    onMove: (event: PointerEvent) => void,
  ): void => {
    const stopDragging = (event: PointerEvent) => {
      isDraggingRef.value = false
      try {
        canvas.releasePointerCapture(event.pointerId)
      } catch {
        // Ignore if the pointer capture was already released.
      }
    }

    canvas.addEventListener('pointerdown', (event) => {
      event.preventDefault()
      isDraggingRef.value = true
      canvas.setPointerCapture(event.pointerId)
      onMove(event)
    })

    canvas.addEventListener('pointermove', (event) => {
      if (!isDraggingRef.value) {
        return
      }

      onMove(event)
    })

    canvas.addEventListener('pointerup', stopDragging)
    canvas.addEventListener('pointercancel', stopDragging)
    canvas.addEventListener('lostpointercapture', () => {
      isDraggingRef.value = false
    })
  }

  handlePointerDrag(elements.spectrumCanvas, dragSpectrum, updateFromSpectrumPoint)
  handlePointerDrag(elements.hueCanvas, dragHue, updateFromHuePoint)

  elements.hexInput.addEventListener('input', () => {
    const normalizedValue = normalizeHexInput(elements.hexInput.value)
    if (!normalizedValue) {
      return
    }

    updateFromHex(normalizedValue)
  })

  elements.hexInput.addEventListener('blur', () => {
    const normalizedValue = normalizeHexInput(elements.hexInput.value)
    elements.hexInput.value = normalizedValue ?? rgbToHex(state.rgb)

    if (normalizedValue) {
      updateFromHex(normalizedValue)
    }
  })

  elements.redInput.addEventListener('input', () => {
    const rgb = readRgbFromInputs(elements)
    if (!rgb) {
      return
    }

    updateFromRgb(rgb)
  })
  elements.greenInput.addEventListener('input', () => {
    const rgb = readRgbFromInputs(elements)
    if (!rgb) {
      return
    }

    updateFromRgb(rgb)
  })
  elements.blueInput.addEventListener('input', () => {
    const rgb = readRgbFromInputs(elements)
    if (!rgb) {
      return
    }

    updateFromRgb(rgb)
  })
  elements.hueInput.addEventListener('input', () => {
    const hsl = readHslFromInputs(elements)
    if (!hsl) {
      return
    }

    updateFromHsl(hsl)
  })
  elements.saturationInput.addEventListener('input', () => {
    const hsl = readHslFromInputs(elements)
    if (!hsl) {
      return
    }

    updateFromHsl(hsl)
  })
  elements.lightnessInput.addEventListener('input', () => {
    const hsl = readHslFromInputs(elements)
    if (!hsl) {
      return
    }

    updateFromHsl(hsl)
  })

  elements.hexCopyButton.addEventListener('click', async () => {
    const hex = rgbToHex(state.rgb)
    const copied = await copyText(hex)

    setPopupMessage(
      copied
        ? formatMessage(messages.colorPicker.copiedMessage, { hex })
        : messages.colorPicker.copyFailedMessage,
    )
  })

  const refresh = () => {
    syncAll()
  }

  window.addEventListener('resize', refresh)
  window.requestAnimationFrame(refresh)
}

export const syncColorPickerLocale = (container: HTMLElement, messages: Messages): void => {
  const root = container.querySelector<HTMLElement>('[data-color-picker-root]') ?? container
  colorPickerLocaleSyncers.get(root)?.(messages)
}
