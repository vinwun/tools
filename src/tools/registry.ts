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
