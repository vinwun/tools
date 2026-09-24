import { messagesByLocale, type Locale } from '../i18n'
import type { ToolId } from './catalog'
import type { MountedTool, MountTool, ToolDefinition } from './types.ts'
import { audioConverterTool } from './audio/audio-converter.ts'
import { imageConverterTool } from './image/image-converter.ts'
import { renderColorPicker } from './image/color-picker/render.ts'
import { mountColorPicker } from './image/color-picker/mount.ts'
import { renderAudioCutter } from './audio/audio-cutter/render.ts'
import { mountAudioCutter } from './audio/audio-cutter/mount.ts'
import { renderVideoAudioSplitter } from './video/video-audio-splitter/render.ts'
import { mountVideoAudioSplitter } from './video/video-audio-splitter/mount.ts'
import { renderVideoCutter } from './video/video-cutter/render.ts'
import { mountVideoCutter } from './video/video-cutter/mount.ts'
import { renderPdfPageOrganizer } from './pdf/pdf-page-organizer/render.ts'
import { renderPdfTextExtractor } from './pdf/pdf-text-extractor/render.ts'
import { renderNumberGenerator } from './rng/number-generator/render.ts'
import { mountNumberGenerator } from './rng/number-generator/mount.ts'
import { renderStringGenerator } from './rng/string-generator/render.ts'
import { mountStringGenerator } from './rng/string-generator/mount.ts'
import { renderStopwatch } from './time/stopwatch/render.ts'
import { mountStopwatch } from './time/stopwatch/mount.ts'
import { renderTimer } from './time/timer/render.ts'
import { mountTimer } from './time/timer/mount.ts'
import { renderTimezoneConverter } from './time/timezone-converter/render.ts'
import { mountTimezoneConverter } from './time/timezone-converter/mount.ts'
import { renderPrimeFactorizer } from './math/prime-factorizer/render.ts'
import { mountPrimeFactorizer } from './math/prime-factorizer/mount.ts'
import { renderBaseConverter } from './math/base-converter/render.ts'
import { mountBaseConverter } from './math/base-converter/mount.ts'
import { renderAspectRatioCalculator } from './math/aspect-ratio-calculator/render.ts'
import { mountAspectRatioCalculator } from './math/aspect-ratio-calculator/mount.ts'
import { renderFloatingPointConverter } from './math/floating-point-converter/render.ts'
import { mountFloatingPointConverter } from './math/floating-point-converter/mount.ts'
import { renderMatrixMultiplier } from './math/matrix-multiplier/render.ts'
import { mountMatrixMultiplier } from './math/matrix-multiplier/mount.ts'
import { renderJsonPrettyPrinter } from './text/json-pretty-printer/render.ts'
import { mountJsonPrettyPrinter } from './text/json-pretty-printer/mount.ts'
import { renderMarkdownViewer } from './text/markdown-viewer/render.ts'
import { mountMarkdownViewer } from './text/markdown-viewer/mount.ts'
import { renderTextCounter } from './text/text-counter/render.ts'
import { mountTextCounter } from './text/text-counter/mount.ts'
import { renderLoremIpsumGenerator } from './text/lorem-ipsum-generator/render.ts'
import { mountLoremIpsumGenerator } from './text/lorem-ipsum-generator/mount.ts'
import { renderUnicodeConverter } from './text/unicode-converter/render.ts'
import { mountUnicodeConverter } from './text/unicode-converter/mount.ts'
import { renderHiddenCharactersInspector } from './text/hidden-characters-inspector/render.ts'
import { mountHiddenCharactersInspector } from './text/hidden-characters-inspector/mount.ts'

const toolDefinitions: Record<ToolId, ToolDefinition> = {
  imageConverter: imageConverterTool,
  colorPicker: { render: renderColorPicker, mount: mountColorPicker },
  audioConverter: audioConverterTool,
  audioCutter: { render: renderAudioCutter, mount: mountAudioCutter },
  videoAudioSplitter: { render: renderVideoAudioSplitter, mount: mountVideoAudioSplitter },
  videoCutter: { render: renderVideoCutter, mount: mountVideoCutter },
  pdfPageOrganizer: {
    render: renderPdfPageOrganizer,
    load: async () => (await import('./pdf/pdf-page-organizer/mount.ts')).mountPdfPageOrganizer,
  },
  pdfTextExtractor: {
    render: renderPdfTextExtractor,
    load: async () => (await import('./pdf/pdf-text-extractor/mount.ts')).mountPdfTextExtractor,
  },
  numberGenerator: { render: renderNumberGenerator, mount: mountNumberGenerator },
  stringGenerator: { render: renderStringGenerator, mount: mountStringGenerator },
  stopwatch: { render: renderStopwatch, mount: mountStopwatch },
  timer: { render: renderTimer, mount: mountTimer },
  timezoneConverter: { render: renderTimezoneConverter, mount: mountTimezoneConverter },
  primeFactorizer: { render: renderPrimeFactorizer, mount: mountPrimeFactorizer },
  baseConverter: { render: renderBaseConverter, mount: mountBaseConverter },
  aspectRatioCalculator: { render: renderAspectRatioCalculator, mount: mountAspectRatioCalculator },
  floatingPointConverter: { render: renderFloatingPointConverter, mount: mountFloatingPointConverter },
  matrixMultiplier: { render: renderMatrixMultiplier, mount: mountMatrixMultiplier },
  jsonPrettyPrinter: { render: renderJsonPrettyPrinter, mount: mountJsonPrettyPrinter },
  markdownViewer: { render: renderMarkdownViewer, mount: mountMarkdownViewer },
  textCounter: { render: renderTextCounter, mount: mountTextCounter },
  loremIpsumGenerator: { render: renderLoremIpsumGenerator, mount: mountLoremIpsumGenerator },
  unicodeConverter: { render: renderUnicodeConverter, mount: mountUnicodeConverter },
  hiddenCharactersInspector: { render: renderHiddenCharactersInspector, mount: mountHiddenCharactersInspector },
}

export const renderToolContent = (toolId: ToolId, locale: Locale): string =>
  toolDefinitions[toolId].render(messagesByLocale[locale])

const loadedMounts = new Map<ToolId, MountTool>()

type ActiveTool = {
  toolId: ToolId
  // Follows locale switches, so a chunk that arrives late mounts with the current locale.
  locale: Locale
  // Null while the tool's chunk is still downloading or failed to load.
  mounted: MountedTool | null
}

// Each mount attempt gets a generation so a chunk that arrives late can tell whether the
// page it was requested for is still on screen.
let mountGeneration = 0
let activeTool: ActiveTool | null = null

const findToolContainer = (): HTMLElement | null =>
  document.querySelector<HTMLElement>('[data-tool-content-root]')

const clearLoadStatus = (container: HTMLElement): void => {
  container.removeAttribute('aria-busy')
  container.querySelector('.tool-layout')?.removeAttribute('inert')
  container.querySelector('[data-tool-load-status]')?.remove()
}

type LoadStatusKind = 'loading' | 'failed'

const renderLoadStatus = (container: HTMLElement, tool: ActiveTool, kind: LoadStatusKind): void => {
  const messages = messagesByLocale[tool.locale].toolPage
  clearLoadStatus(container)

  const status = document.createElement('p')
  status.className = `tool-load-status tool-load-status-${kind}`
  status.dataset.toolLoadStatus = kind
  status.setAttribute('role', 'status')
  status.textContent = kind === 'loading' ? messages.loading : messages.loadFailed

  if (kind === 'loading') {
    container.setAttribute('aria-busy', 'true')
    container.querySelector('.tool-layout')?.setAttribute('inert', '')
  } else {
    const retryButton = document.createElement('button')
    retryButton.type = 'button'
    retryButton.className = 'tool-action tool-load-retry'
    retryButton.textContent = messages.retryAction
    retryButton.addEventListener('click', () => {
      void mountToolContent(tool.toolId, tool.locale)
    })
    status.append(retryButton)
  }

  container.prepend(status)
}

const loadMount = async (
  toolId: ToolId,
  load: () => Promise<MountTool>,
  container: HTMLElement,
  tool: ActiveTool,
): Promise<MountTool | null> => {
  const generation = mountGeneration
  renderLoadStatus(container, tool, 'loading')

  try {
    const mount = await load()
    loadedMounts.set(toolId, mount)
    // Navigating away replaces the container.
    if (generation !== mountGeneration || !container.isConnected) {
      return null
    }

    clearLoadStatus(container)
    return mount
  } catch {
    if (generation === mountGeneration) {
      renderLoadStatus(container, tool, 'failed')
    }

    return null
  }
}

// Tears down the tool on screen; runs before its DOM is replaced by another page.
export const unmountToolContent = (): void => {
  mountGeneration += 1
  activeTool?.mounted?.destroy?.()
  activeTool = null
}

export const mountToolContent = async (toolId: ToolId, locale: Locale): Promise<void> => {
  unmountToolContent()

  const container = findToolContainer()
  if (!container) {
    return
  }

  const tool: ActiveTool = { toolId, locale, mounted: null }
  activeTool = tool

  const definition = toolDefinitions[toolId]
  const mount =
    'mount' in definition
      ? definition.mount
      : (loadedMounts.get(toolId) ?? (await loadMount(toolId, definition.load, container, tool)))
  if (!mount) {
    return
  }

  tool.mounted = mount(container, messagesByLocale[tool.locale])
}

export const updateMountedToolLocale = (locale: Locale): void => {
  if (!activeTool) {
    return
  }

  activeTool.locale = locale
  if (activeTool.mounted) {
    activeTool.mounted.updateLocale?.(messagesByLocale[locale])
    return
  }

  // A pending or failed load leaves its message on screen, so it has to follow the locale too.
  const container = findToolContainer()
  const kind = container?.querySelector<HTMLElement>('[data-tool-load-status]')?.dataset.toolLoadStatus
  if (container && (kind === 'loading' || kind === 'failed')) {
    renderLoadStatus(container, activeTool, kind)
  }
}
