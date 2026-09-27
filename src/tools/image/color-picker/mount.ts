import type { Messages } from '../../../i18n/schema'
import type { ColorPickerElements, ColorState, HSLColor, RGBColor } from './types.ts'
import {
  DEFAULT_COLOR,
  drawHueCanvas,
  drawSpectrumCanvas,
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
import { formatMessage } from '../../foundations/dom.ts'
import { copyText } from '../../foundations/clipboard.ts'
import { queryRequired } from '../../foundations/dom.ts'
import type { MountTool } from '../../types.ts'

export const mountColorPicker: MountTool = (container, initialMessages) => {
  const elements = queryRequired<ColorPickerElements>(container, {
    spectrumCanvas: '[data-color-picker-spectrum]',
    spectrumHandle: '[data-color-picker-spectrum-handle]',
    hueCanvas: '[data-color-picker-hue]',
    hueHandle: '[data-color-picker-hue-handle]',
    hexInput: '[data-color-picker-hex]',
    hexCopyButton: '[data-color-picker-copy]',
    copyPopup: '[data-color-picker-popup]',
    redInput: '[data-color-picker-r]',
    greenInput: '[data-color-picker-g]',
    blueInput: '[data-color-picker-b]',
    hueInput: '[data-color-picker-h]',
    saturationInput: '[data-color-picker-s]',
    lightnessInput: '[data-color-picker-l]',
  })
  if (!elements) {
    return {}
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

  let spectrumHue: number | null = null

  // The spectrum is painted pixel by pixel, so it is only redrawn when its hue or size changes.
  const redrawCanvases = (resized: boolean): void => {
    if (resized || state.hsl.h !== spectrumHue) {
      drawSpectrumCanvas(elements.spectrumCanvas, state.hsl.h)
      spectrumHue = state.hsl.h
    }
    if (resized) {
      drawHueCanvas(elements.hueCanvas)
    }
    updateCanvasUI()
  }

  const syncInputs = (): void => {
    // The hex field is not rewritten while being typed in; its blur handler normalizes it.
    if (document.activeElement !== elements.hexInput) {
      elements.hexInput.value = rgbToHex(state.rgb)
    }
    elements.redInput.value = String(state.rgb.r)
    elements.greenInput.value = String(state.rgb.g)
    elements.blueInput.value = String(state.rgb.b)
    elements.hueInput.value = String(state.hsl.h)
    elements.saturationInput.value = String(state.hsl.s)
    elements.lightnessInput.value = String(state.hsl.l)
  }

  const syncAll = (resized = false): void => {
    syncInputs()
    redrawCanvases(resized)
  }
  const syncAfterResize = (): void => syncAll(true)

  const syncLocalizedText = (): void => {
    container.querySelectorAll<HTMLElement>('[data-color-picker-text]').forEach((element) => {
      const key = element.dataset.colorPickerText as keyof Messages['colorPicker']
      element.textContent = messages.colorPicker[key]
    })
    elements.spectrumCanvas.setAttribute('aria-label', messages.colorPicker.squareLabel)
    elements.hueCanvas.setAttribute('aria-label', messages.colorPicker.hueBarLabel)
  }

  const syncLocale = (nextMessages: Messages): void => {
    messages = nextMessages
    syncLocalizedText()
    syncAll()
  }

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

  for (const input of [elements.redInput, elements.greenInput, elements.blueInput]) {
    input.addEventListener('input', () => {
      const rgb = readRgbFromInputs(elements)
      if (rgb) updateFromRgb(rgb)
    })
  }
  for (const input of [elements.hueInput, elements.saturationInput, elements.lightnessInput]) {
    input.addEventListener('input', () => {
      const hsl = readHslFromInputs(elements)
      if (hsl) updateFromHsl(hsl)
    })
  }
  // Out-of-range or empty values are ignored while typing and replaced by the current color on leave.
  for (const input of [elements.redInput, elements.greenInput, elements.blueInput, elements.hueInput, elements.saturationInput, elements.lightnessInput]) {
    input.addEventListener('blur', syncInputs)
  }

  elements.hexCopyButton.addEventListener('click', async () => {
    const hex = rgbToHex(state.rgb)
    const copied = await copyText(hex)

    setPopupMessage(
      copied
        ? formatMessage(messages.colorPicker.copiedMessage, { hex })
        : messages.colorPicker.copyFailedMessage,
    )
  })

  const listeners = new AbortController()
  window.addEventListener('resize', syncAfterResize, { signal: listeners.signal })
  const initialFrame = window.requestAnimationFrame(syncAfterResize)

  return {
    updateLocale: syncLocale,
    destroy: () => {
      listeners.abort()
      window.cancelAnimationFrame(initialFrame)
      window.clearTimeout(copyPopupTimer)
    },
  }
}
