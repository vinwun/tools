import { setCanvasSize } from '../../foundations/canvas.ts'
import { clamp } from '../../foundations/numbers.ts'
import type { ColorPickerElements, HSLColor, RGBColor } from './types.ts'

export const DEFAULT_COLOR: RGBColor = { r: 31, g: 111, b: 235 }

export const round = (value: number): number => Math.round(value)

const toHexPart = (value: number): string =>
  value.toString(16).padStart(2, '0').toUpperCase()

export const rgbToHex = (rgb: RGBColor): string =>
  `#${toHexPart(rgb.r)}${toHexPart(rgb.g)}${toHexPart(rgb.b)}`

export const rgbToHsl = (rgb: RGBColor): HSLColor => {
  const r = rgb.r / 255
  const g = rgb.g / 255
  const b = rgb.b / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min

  let hue = 0
  let saturation = 0
  const lightness = (max + min) / 2

  if (delta !== 0) {
    saturation = delta / (1 - Math.abs(2 * lightness - 1))

    switch (max) {
      case r:
        hue = ((g - b) / delta) % 6
        break
      case g:
        hue = (b - r) / delta + 2
        break
      default:
        hue = (r - g) / delta + 4
        break
    }
  }

  const normalizedHue = Math.round((hue * 60 + 360) % 360)

  return {
    h: normalizedHue === 360 ? 0 : normalizedHue,
    s: round(clamp(saturation, 0, 1) * 100),
    l: round(clamp(lightness, 0, 1) * 100),
  }
}

export const hslToRgb = (hsl: HSLColor): RGBColor => {
  const hue = ((hsl.h % 360) + 360) % 360
  const saturation = clamp(hsl.s, 0, 100) / 100
  const lightness = clamp(hsl.l, 0, 100) / 100
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation
  const hueSegment = hue / 60
  const secondary = chroma * (1 - Math.abs((hueSegment % 2) - 1))
  const match = lightness - chroma / 2

  let red = 0
  let green = 0
  let blue = 0

  if (hueSegment >= 0 && hueSegment < 1) {
    red = chroma
    green = secondary
  } else if (hueSegment < 2) {
    red = secondary
    green = chroma
  } else if (hueSegment < 3) {
    green = chroma
    blue = secondary
  } else if (hueSegment < 4) {
    green = secondary
    blue = chroma
  } else if (hueSegment < 5) {
    red = secondary
    blue = chroma
  } else {
    red = chroma
    blue = secondary
  }

  return {
    r: round(clamp((red + match) * 255, 0, 255)),
    g: round(clamp((green + match) * 255, 0, 255)),
    b: round(clamp((blue + match) * 255, 0, 255)),
  }
}

export const getReadableTextColor = (rgb: RGBColor): string => {
  const linearize = (channel: number): number => {
    const normalized = channel / 255
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4
  }

  const luminance =
    0.2126 * linearize(rgb.r) + 0.7152 * linearize(rgb.g) + 0.0722 * linearize(rgb.b)

  return luminance > 0.54 ? '#111827' : '#FFFFFF'
}

const parseNumberInput = (value: string): number | null => {
  if (value.trim() === '') {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export const readRgbFromInputs = (elements: ColorPickerElements): RGBColor | null => {
  const r = parseNumberInput(elements.redInput.value)
  const g = parseNumberInput(elements.greenInput.value)
  const b = parseNumberInput(elements.blueInput.value)

  if (r === null || g === null || b === null) {
    return null
  }

  return {
    r: clamp(round(r), 0, 255),
    g: clamp(round(g), 0, 255),
    b: clamp(round(b), 0, 255),
  }
}

export const readHslFromInputs = (elements: ColorPickerElements): HSLColor | null => {
  const h = parseNumberInput(elements.hueInput.value)
  const s = parseNumberInput(elements.saturationInput.value)
  const l = parseNumberInput(elements.lightnessInput.value)

  if (h === null || s === null || l === null) {
    return null
  }

  return {
    h: clamp(round(h), 0, 360),
    s: clamp(round(s), 0, 100),
    l: clamp(round(l), 0, 100),
  }
}

const isHexColor = (value: string): boolean => /^#?[0-9a-fA-F]{6}$/.test(value.trim())

export const hexToRgb = (value: string): RGBColor | null => {
  if (!isHexColor(value)) {
    return null
  }

  const normalized = value.trim().replace('#', '')
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  }
}

export const normalizeHexInput = (value: string): string | null => {
  const rgb = hexToRgb(value)
  return rgb ? rgbToHex(rgb) : null
}

export const drawSpectrumCanvas = (canvas: HTMLCanvasElement, hue: number): void => {
  const { width, height } = setCanvasSize(canvas)
  const context = canvas.getContext('2d')
  if (!context) {
    return
  }

  const image = context.createImageData(width, height)
  const data = image.data

  for (let y = 0; y < height; y += 1) {
    const saturation = 100 - (y / Math.max(height - 1, 1)) * 100

    for (let x = 0; x < width; x += 1) {
      const lightness = (x / Math.max(width - 1, 1)) * 100
      const { r, g, b } = hslToRgb({ h: hue, s: saturation, l: lightness })
      const index = (y * width + x) * 4

      data[index] = r
      data[index + 1] = g
      data[index + 2] = b
      data[index + 3] = 255
    }
  }

  context.putImageData(image, 0, 0)
}

export const drawHueCanvas = (canvas: HTMLCanvasElement): void => {
  const { width, height } = setCanvasSize(canvas)
  const context = canvas.getContext('2d')
  if (!context) {
    return
  }

  const gradient = context.createLinearGradient(0, 0, 0, height)
  gradient.addColorStop(0, '#FF0000')
  gradient.addColorStop(1 / 6, '#FFFF00')
  gradient.addColorStop(2 / 6, '#00FF00')
  gradient.addColorStop(3 / 6, '#00FFFF')
  gradient.addColorStop(4 / 6, '#0000FF')
  gradient.addColorStop(5 / 6, '#FF00FF')
  gradient.addColorStop(1, '#FF0000')

  context.fillStyle = gradient
  context.fillRect(0, 0, width, height)
}

export const getNormalizedPoint = (
  canvas: HTMLCanvasElement,
  event: PointerEvent,
): { x: number; y: number } => {
  const rect = canvas.getBoundingClientRect()
  const x = rect.width === 0 ? 0 : clamp((event.clientX - rect.left) / rect.width, 0, 1)
  const y = rect.height === 0 ? 0 : clamp((event.clientY - rect.top) / rect.height, 0, 1)

  return { x, y }
}
