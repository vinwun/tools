import { messagesByLocale, type Locale } from '../i18n'
import type { ToolId } from './catalog'
import { renderAudioConverter, mountAudioConverter, updateAudioConverterLocale } from './audio/audio-converter.ts'
import { renderImageConverter, mountImageConverter, updateImageConverterLocale } from './image/image-converter.ts'
import { renderColorPicker } from './image/color-picker/render.ts'
import { mountColorPicker, updateColorPickerLocale } from './image/color-picker/mount.ts'
import { renderAudioCutter } from './audio/audio-cutter/render.ts'
import { mountAudioCutter, updateAudioCutterLocale } from './audio/audio-cutter/mount.ts'
import { renderVideoAudioSplitter } from './video/video-audio-splitter/render.ts'
import { mountVideoAudioSplitter, updateVideoAudioSplitterLocale } from './video/video-audio-splitter/mount.ts'
import { renderVideoCutter } from './video/video-cutter/render.ts'
import { mountVideoCutter, updateVideoCutterLocale } from './video/video-cutter/mount.ts'
import { renderPdfPageOrganizer } from './pdf/pdf-page-organizer/render.ts'
import { renderPdfTextExtractor } from './pdf/pdf-text-extractor/render.ts'
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
import { renderFloatingPointConverter } from './math/floating-point-converter/render.ts'
import { mountFloatingPointConverter, updateFloatingPointConverterLocale } from './math/floating-point-converter/mount.ts'
import { createInitialFloatingPointConverterState } from './math/floating-point-converter/utils.ts'
import { renderMatrixMultiplier } from './math/matrix-multiplier/render.ts'
import { mountMatrixMultiplier, updateMatrixMultiplierLocale } from './math/matrix-multiplier/mount.ts'
import { createInitialMatrixMultiplierState } from './math/matrix-multiplier/utils.ts'
import { renderJsonPrettyPrinter } from './text/json-pretty-printer/render.ts'
import { mountJsonPrettyPrinter, updateJsonPrettyPrinterLocale } from './text/json-pretty-printer/mount.ts'
import { createInitialJsonPrettyPrinterState } from './text/json-pretty-printer/utils.ts'
import { renderMarkdownViewer } from './text/markdown-viewer/render.ts'
import { mountMarkdownViewer, updateMarkdownViewerLocale } from './text/markdown-viewer/mount.ts'
import { createInitialMarkdownViewerState } from './text/markdown-viewer/utils.ts'
import { renderTextCounter } from './text/text-counter/render.ts'
import { mountTextCounter, updateTextCounterLocale } from './text/text-counter/mount.ts'
import { createInitialTextCounterState } from './text/text-counter/utils.ts'
import { renderLoremIpsumGenerator } from './text/lorem-ipsum-generator/render.ts'
import { mountLoremIpsumGenerator, updateLoremIpsumGeneratorLocale } from './text/lorem-ipsum-generator/mount.ts'
import { createInitialLoremIpsumGeneratorState } from './text/lorem-ipsum-generator/utils.ts'
import { renderUnicodeConverter } from './text/unicode-converter/render.ts'
import { mountUnicodeConverter, updateUnicodeConverterLocale } from './text/unicode-converter/mount.ts'
import { createInitialUnicodeConverterState } from './text/unicode-converter/utils.ts'
import { renderHiddenCharactersInspector } from './text/hidden-characters-inspector/render.ts'
import { mountHiddenCharactersInspector, updateHiddenCharactersInspectorLocale } from './text/hidden-characters-inspector/mount.ts'
import { createInitialHiddenCharactersInspectorState } from './text/hidden-characters-inspector/utils.ts'

type ToolModule = {
  mount: (container: HTMLElement, locale: Locale) => void
  updateLocale?: (container: HTMLElement, locale: Locale) => void
}

type ToolRenderer = {
  render: (locale: Locale) => string
  mount?: (container: HTMLElement, locale: Locale) => void
  updateLocale?: (container: HTMLElement, locale: Locale) => void
  // Tools with heavy dependencies: fetch code the first time the tool is opened.
  load?: () => Promise<ToolModule>
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
    updateLocale: (container, locale) => updateColorPickerLocale(container, messagesByLocale[locale]),
  },
  audioConverter: {
    render: (locale) => renderAudioConverter(messagesByLocale[locale]),
    mount: (container, locale) => mountAudioConverter(container, messagesByLocale[locale]),
    updateLocale: (container, locale) => updateAudioConverterLocale(container, messagesByLocale[locale]),
  },
  audioCutter: {
    render: (locale) => renderAudioCutter(messagesByLocale[locale]),
    mount: (container, locale) => mountAudioCutter(container, locale),
    updateLocale: (container, locale) => updateAudioCutterLocale(container, messagesByLocale[locale]),
  },
  videoAudioSplitter: {
    render: (locale) => renderVideoAudioSplitter(messagesByLocale[locale]),
    mount: (container, locale) => mountVideoAudioSplitter(container, locale),
    updateLocale: (container, locale) => updateVideoAudioSplitterLocale(container, messagesByLocale[locale], locale),
  },
  videoCutter: {
    render: (locale) => renderVideoCutter(messagesByLocale[locale]),
    mount: (container, locale) => mountVideoCutter(container, locale),
    updateLocale: (container, locale) => updateVideoCutterLocale(container, messagesByLocale[locale], locale),
  },
  pdfPageOrganizer: {
    render: (locale) => renderPdfPageOrganizer(messagesByLocale[locale]),
    load: async () => {
      const { mountPdfPageOrganizer, updatePdfPageOrganizerLocale } = await import('./pdf/pdf-page-organizer/mount.ts')

      return {
        mount: (container, locale) => mountPdfPageOrganizer(container, locale),
        updateLocale: (container, locale) => updatePdfPageOrganizerLocale(container, locale),
      }
    },
  },
  pdfTextExtractor: {
    render: (locale) => renderPdfTextExtractor(messagesByLocale[locale]),
    load: async () => {
      const { mountPdfTextExtractor, updatePdfTextExtractorLocale } = await import('./pdf/pdf-text-extractor/mount.ts')

      return {
        mount: (container, locale) => mountPdfTextExtractor(container, locale),
        updateLocale: (container, locale) => updatePdfTextExtractorLocale(container, locale),
      }
    },
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
  baseConverter: {
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
  floatingPointConverter: {
    render: (locale) =>
      renderFloatingPointConverter(messagesByLocale[locale], createInitialFloatingPointConverterState()),
    mount: (container, locale) => mountFloatingPointConverter(container, messagesByLocale[locale]),
    updateLocale: (container, locale) => updateFloatingPointConverterLocale(container, messagesByLocale[locale]),
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
  markdownViewer: {
    render: (locale) => renderMarkdownViewer(messagesByLocale[locale], createInitialMarkdownViewerState()),
    mount: (container, locale) => mountMarkdownViewer(container, messagesByLocale[locale]),
    updateLocale: (container, locale) => updateMarkdownViewerLocale(container, messagesByLocale[locale]),
  },
  textCounter: {
    render: (locale) => renderTextCounter(messagesByLocale[locale], createInitialTextCounterState()),
    mount: (container, locale) => mountTextCounter(container, messagesByLocale[locale]),
    updateLocale: (container, locale) => updateTextCounterLocale(container, messagesByLocale[locale]),
  },
  loremIpsumGenerator: {
    render: (locale) => renderLoremIpsumGenerator(messagesByLocale[locale], createInitialLoremIpsumGeneratorState()),
    mount: (container, locale) => mountLoremIpsumGenerator(container, messagesByLocale[locale]),
    updateLocale: (container, locale) => updateLoremIpsumGeneratorLocale(container, messagesByLocale[locale]),
  },
  unicodeConverter: {
    render: (locale) => renderUnicodeConverter(messagesByLocale[locale], createInitialUnicodeConverterState()),
    mount: (container, locale) => mountUnicodeConverter(container, messagesByLocale[locale]),
    updateLocale: (container, locale) => updateUnicodeConverterLocale(container, messagesByLocale[locale]),
  },
  hiddenCharactersInspector: {
    render: (locale) => renderHiddenCharactersInspector(messagesByLocale[locale], createInitialHiddenCharactersInspectorState()),
    mount: (container, locale) => mountHiddenCharactersInspector(container, messagesByLocale[locale]),
    updateLocale: (container, locale) => updateHiddenCharactersInspectorLocale(container, messagesByLocale[locale]),
  },
}

export const renderToolContent = (toolId: ToolId, locale: Locale): string => {
  const renderer = toolRenderers[toolId]
  if (renderer) {
    return renderer.render(locale)
  }

  return `<section class="tool-layout tool-placeholder"><p>${messagesByLocale[locale].toolPage.comingSoon}</p></section>`
}

const loadedToolModules = new Map<ToolId, ToolModule>()

type PendingToolMount = {
  generation: number
  toolId: ToolId
  locale: Locale
}

// Each mount attempt gets a generation so a chunk that arrives late can tell whether the
// page it was requested for is still on screen.
let mountGeneration = 0
let pendingToolMount: PendingToolMount | null = null

const findToolContainer = (): HTMLElement | null =>
  document.querySelector<HTMLElement>('[data-tool-content-root]')

const clearLoadStatus = (container: HTMLElement): void => {
  container.removeAttribute('aria-busy')
  container.querySelector('[data-tool-load-status]')?.remove()
}

const renderLoadStatus = (
  container: HTMLElement,
  toolId: ToolId,
  locale: Locale,
  kind: 'loading' | 'failed',
): void => {
  const messages = messagesByLocale[locale].toolPage
  clearLoadStatus(container)

  const status = document.createElement('p')
  status.className = `tool-load-status tool-load-status-${kind}`
  status.dataset.toolLoadStatus = kind
  status.setAttribute('role', 'status')
  status.textContent = kind === 'loading' ? messages.loading : messages.loadFailed

  if (kind === 'loading') {
    container.setAttribute('aria-busy', 'true')
  } else {
    const retryButton = document.createElement('button')
    retryButton.type = 'button'
    retryButton.className = 'tool-action tool-load-retry'
    retryButton.textContent = messages.retryAction
    retryButton.addEventListener('click', () => {
      void mountToolContent(toolId, locale)
    })
    status.append(retryButton)
  }

  container.prepend(status)
}

const mountLoadedToolContent = async (
  toolId: ToolId,
  load: () => Promise<ToolModule>,
  container: HTMLElement,
  locale: Locale,
): Promise<void> => {
  const generation = mountGeneration
  pendingToolMount = { generation, toolId, locale }
  renderLoadStatus(container, toolId, locale, 'loading')

  let toolModule: ToolModule
  try {
    toolModule = await load()
  } catch {
    if (generation === mountGeneration) {
      renderLoadStatus(container, toolId, pendingToolMount?.locale ?? locale, 'failed')
      pendingToolMount = null
    }

    return
  }

  loadedToolModules.set(toolId, toolModule)

  // Navigating away replaces the container, switching locale can pick a different one.
  if (generation !== mountGeneration || !container.isConnected) {
    return
  }

  const mountLocale = pendingToolMount?.locale ?? locale
  pendingToolMount = null
  clearLoadStatus(container)
  toolModule.mount(container, mountLocale)
}

export const mountToolContent = async (toolId: ToolId, locale: Locale): Promise<void> => {
  mountGeneration += 1
  pendingToolMount = null

  const renderer = toolRenderers[toolId]
  if (!renderer) {
    return
  }

  const toolContainer = findToolContainer()
  if (!toolContainer) {
    return
  }

  if (renderer.mount) {
    renderer.mount(toolContainer, locale)
    return
  }

  const { load } = renderer
  if (!load) {
    return
  }

  const loadedModule = loadedToolModules.get(toolId)
  if (loadedModule) {
    loadedModule.mount(toolContainer, locale)
    return
  }

  await mountLoadedToolContent(toolId, load, toolContainer, locale)
}

export const hasMountedToolContent = (toolId: ToolId): boolean => {
  const renderer = toolRenderers[toolId]

  return Boolean(renderer?.mount ?? renderer?.load)
}

export const updateMountedToolLocale = (toolId: ToolId, locale: Locale): void => {
  const renderer = toolRenderers[toolId]
  if (!renderer) {
    return
  }

  const toolContainer = findToolContainer()
  if (!toolContainer) {
    return
  }

  // Still downloading: mount with the locale picked in the meantime instead of the stale one.
  if (pendingToolMount?.generation === mountGeneration && pendingToolMount.toolId === toolId) {
    pendingToolMount = { ...pendingToolMount, locale }
    renderLoadStatus(toolContainer, toolId, locale, 'loading')
    return
  }

  const loadedModule = loadedToolModules.get(toolId)

  // A failed load leaves its message on screen, so it has to follow the locale as well.
  if (!loadedModule && toolContainer.querySelector('[data-tool-load-status="failed"]')) {
    renderLoadStatus(toolContainer, toolId, locale, 'failed')
    return
  }

  const updateLocale = renderer.updateLocale ?? loadedModule?.updateLocale
  if (!updateLocale) {
    return
  }

  updateLocale(toolContainer, locale)
}
