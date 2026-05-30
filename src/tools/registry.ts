import { messagesByLocale, type Locale } from '../i18n'
import type { ToolId } from './catalog'
import { renderAudioConverter, mountAudioConverter, updateAudioConverterLocale } from './audio/audio-converter.ts'
import { renderImageConverter, mountImageConverter, updateImageConverterLocale } from './image/image-converter.ts'
import { renderColorPicker } from './image/color-picker/render.ts'
import { mountColorPicker, syncColorPickerLocale } from './image/color-picker/mount.ts'
import { renderAudioTrimmer } from './audio/audio-trimmer/render.ts'
import { mountAudioTrimmer, syncAudioTrimmerLocale } from './audio/audio-trimmer/mount.ts'
import { renderPdfMergeReorderSplit } from './pdf/pdf-tools/render.ts'
import { mountPdfMergeReorderSplit, syncPdfLocale } from './pdf/pdf-tools/mount.ts'
import { renderPdfTextExtractor } from './pdf/pdf-text-extractor/render.ts'
import { mountPdfTextExtractor, syncPdfTextExtractorLocale } from './pdf/pdf-text-extractor/mount.ts'
import { renderNumberGenerator } from './rng/number-generator/render.ts'
import { createInitialNumberGeneratorState } from './rng/number-generator/utils.ts'
import { mountNumberGenerator, updateNumberGeneratorLocale } from './rng/number-generator/mount.ts'
import { renderStringGenerator } from './rng/string-generator/render.ts'
import { createInitialStringGeneratorState } from './rng/string-generator/utils.ts'
import { mountStringGenerator, updateStringGeneratorLocale } from './rng/string-generator/mount.ts'
import { renderStopwatch } from './time/stopwatch/render.ts'
import { mountStopwatch, updateStopwatchLocale } from './time/stopwatch/mount.ts'
import { renderTimer } from './time/timer/render.ts'
import { mountTimer, updateTimerLocale } from './time/timer/mount.ts'
import { renderTimezoneConverter } from './time/timezone-converter/render.ts'
import { mountTimezoneConverter, updateTimezoneConverterLocale } from './time/timezone-converter/mount.ts'
import { renderPrimeFactorizer } from './math/prime-factorizer/render.ts'
import { mountPrimeFactorizer, updatePrimeFactorizerLocale } from './math/prime-factorizer/mount.ts'
import { createInitialPrimeFactorizerState } from './math/prime-factorizer/utils.ts'
import { renderBaseConverter } from './math/base-converter/render.ts'
import { mountBaseConverter, updateBaseConverterLocale } from './math/base-converter/mount.ts'
import { createInitialBaseConverterState } from './math/base-converter/utils.ts'
import { renderAspectRatioCalculator } from './math/aspect-ratio-calculator/render.ts'
import { mountAspectRatioCalculator, updateAspectRatioCalculatorLocale } from './math/aspect-ratio-calculator/mount.ts'
import { createInitialAspectRatioCalculatorState } from './math/aspect-ratio-calculator/utils.ts'
import { renderFloatingPointInspector } from './math/floating-point-inspector/render.ts'
import { mountFloatingPointInspector, updateFloatingPointInspectorLocale } from './math/floating-point-inspector/mount.ts'
import { createInitialFloatingPointInspectorState } from './math/floating-point-inspector/utils.ts'
import { renderMatrixMultiplier } from './math/matrix-multiplier/render.ts'
import { mountMatrixMultiplier, updateMatrixMultiplierLocale } from './math/matrix-multiplier/mount.ts'
import { createInitialMatrixMultiplierState } from './math/matrix-multiplier/utils.ts'
import { renderJsonPrettyPrinter } from './text/json-pretty-printer/render.ts'
import { mountJsonPrettyPrinter, updateJsonPrettyPrinterLocale } from './text/json-pretty-printer/mount.ts'
import { createInitialJsonPrettyPrinterState } from './text/json-pretty-printer/utils.ts'

type ToolRenderer = {
  render: (locale: Locale) => string
  mount?: (container: HTMLElement, locale: Locale) => void
  updateLocale?: (container: HTMLElement, locale: Locale) => void
}

const toolRenderers: Partial<Record<ToolId, ToolRenderer>> = {
  imageConverter: {
    render: (locale) => renderImageConverter(messagesByLocale[locale]),
    mount: (container, locale) => mountImageConverter(container, messagesByLocale[locale]),
    updateLocale: (container, locale) => updateImageConverterLocale(container, messagesByLocale[locale]),
  },
  colorPicker: {
    render: (locale) => renderColorPicker(messagesByLocale[locale]),
    mount: (container, locale) => mountColorPicker(container, messagesByLocale[locale]),
    updateLocale: (container, locale) => syncColorPickerLocale(container, messagesByLocale[locale]),
  },
  audioConverter: {
    render: (locale) => renderAudioConverter(messagesByLocale[locale]),
    mount: (container, locale) => mountAudioConverter(container, messagesByLocale[locale]),
    updateLocale: (container, locale) => updateAudioConverterLocale(container, messagesByLocale[locale]),
  },
  audioTrimmer: {
    render: (locale) => renderAudioTrimmer(messagesByLocale[locale]),
    mount: (container, locale) => mountAudioTrimmer(container, locale),
    updateLocale: (container, locale) => syncAudioTrimmerLocale(container, messagesByLocale[locale]),
  },
  pdfMergeReorderSplit: {
    render: (locale) => renderPdfMergeReorderSplit(messagesByLocale[locale]),
    mount: (container, locale) => mountPdfMergeReorderSplit(container, locale),
    updateLocale: (container, locale) => syncPdfLocale(container, locale),
  },
  pdfTextExtractor: {
    render: (locale) => renderPdfTextExtractor(messagesByLocale[locale]),
    mount: (container, locale) => mountPdfTextExtractor(container, locale),
    updateLocale: (container, locale) => syncPdfTextExtractorLocale(container, locale),
  },
  numberGenerator: {
    render: (locale) => renderNumberGenerator(messagesByLocale[locale], createInitialNumberGeneratorState()),
    mount: (container, locale) => mountNumberGenerator(container, messagesByLocale[locale]),
    updateLocale: (container, locale) => updateNumberGeneratorLocale(container, messagesByLocale[locale]),
  },
  stringGenerator: {
    render: (locale) => renderStringGenerator(messagesByLocale[locale], createInitialStringGeneratorState()),
    mount: (container, locale) => mountStringGenerator(container, messagesByLocale[locale]),
    updateLocale: (container, locale) => updateStringGeneratorLocale(container, messagesByLocale[locale]),
  },
  stopwatch: {
    render: (locale) => renderStopwatch(messagesByLocale[locale]),
    mount: (container, locale) => mountStopwatch(container, messagesByLocale[locale]),
    updateLocale: (container, locale) => updateStopwatchLocale(container, messagesByLocale[locale]),
  },
  timer: {
    render: (locale) => renderTimer(messagesByLocale[locale]),
    mount: (container, locale) => mountTimer(container, messagesByLocale[locale]),
    updateLocale: (container, locale) => updateTimerLocale(container, messagesByLocale[locale]),
  },
  timezoneConverter: {
    render: (locale) => renderTimezoneConverter(messagesByLocale[locale]),
    mount: (container, locale) => mountTimezoneConverter(container, messagesByLocale[locale]),
    updateLocale: (container, locale) => updateTimezoneConverterLocale(container, messagesByLocale[locale]),
  },
  primeFactorizer: {
    render: (locale) => renderPrimeFactorizer(messagesByLocale[locale], createInitialPrimeFactorizerState()),
    mount: (container, locale) => mountPrimeFactorizer(container, messagesByLocale[locale]),
    updateLocale: (container, locale) => updatePrimeFactorizerLocale(container, messagesByLocale[locale]),
  },
  numericalConverter: {
    render: (locale) => renderBaseConverter(messagesByLocale[locale], createInitialBaseConverterState()),
    mount: (container, locale) => mountBaseConverter(container, messagesByLocale[locale]),
    updateLocale: (container, locale) => updateBaseConverterLocale(container, messagesByLocale[locale]),
  },
  aspectRatioCalculator: {
    render: (locale) =>
      renderAspectRatioCalculator(messagesByLocale[locale], createInitialAspectRatioCalculatorState()),
    mount: (container, locale) => mountAspectRatioCalculator(container, messagesByLocale[locale]),
    updateLocale: (container, locale) =>
      updateAspectRatioCalculatorLocale(container, messagesByLocale[locale]),
  },
  floatingPointInspector: {
    render: (locale) =>
      renderFloatingPointInspector(messagesByLocale[locale], createInitialFloatingPointInspectorState()),
    mount: (container, locale) => mountFloatingPointInspector(container, messagesByLocale[locale]),
    updateLocale: (container, locale) => updateFloatingPointInspectorLocale(container, messagesByLocale[locale]),
  },
  matrixMultiplier: {
    render: (locale) => renderMatrixMultiplier(messagesByLocale[locale], createInitialMatrixMultiplierState(messagesByLocale[locale])),
    mount: (container, locale) => mountMatrixMultiplier(container, messagesByLocale[locale]),
    updateLocale: (container, locale) => updateMatrixMultiplierLocale(container, messagesByLocale[locale]),
  },
  jsonPrettyPrinter: {
    render: (locale) => renderJsonPrettyPrinter(messagesByLocale[locale], createInitialJsonPrettyPrinterState()),
    mount: (container, locale) => mountJsonPrettyPrinter(container, messagesByLocale[locale]),
    updateLocale: (container, locale) => updateJsonPrettyPrinterLocale(container, messagesByLocale[locale]),
  },
}

export const renderToolContent = (toolId: ToolId, locale: Locale): string => {
  const renderer = toolRenderers[toolId]
  if (renderer) {
    return renderer.render(locale)
  }

  return `<section class="tool-layout tool-placeholder"><p>${messagesByLocale[locale].toolPage.comingSoon}</p></section>`
}

export const mountToolContent = (toolId: ToolId, locale: Locale): void => {
  const renderer = toolRenderers[toolId]
  if (!renderer?.mount) {
    return
  }

  const toolContainer = document.querySelector<HTMLElement>('[data-tool-content-root]')
  if (!toolContainer) {
    return
  }

  renderer.mount(toolContainer, locale)
}

export const hasMountedToolContent = (toolId: ToolId): boolean => Boolean(toolRenderers[toolId]?.mount)

export const updateMountedToolLocale = (toolId: ToolId, locale: Locale): void => {
  const renderer = toolRenderers[toolId]
  if (!renderer?.updateLocale) {
    return
  }

  const toolContainer = document.querySelector<HTMLElement>('[data-tool-content-root]')
  if (!toolContainer) {
    return
  }

  renderer.updateLocale(toolContainer, locale)
}
