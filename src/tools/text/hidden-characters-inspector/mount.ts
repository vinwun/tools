import type { Messages } from '../../../i18n/schema.ts'
import type { HiddenCharCategory, HiddenCharactersInspectorElements } from './types.ts'
import {
  countHiddenCharacters,
  createInitialHiddenCharactersInspectorState,
  escapeHtml,
  EXAMPLE_TEXT,
  splitSegments,
  toCodePointHex,
  type PreviewSegment,
} from './utils.ts'

const hiddenCharactersInspectorLocaleSyncers = new WeakMap<
  HTMLElement,
  (messages: Messages) => void
>()

const queryHiddenCharactersInspectorElements = (
  container: HTMLElement,
): HiddenCharactersInspectorElements | null => {
  const form = container.querySelector<HTMLFormElement>(
    '[data-hidden-characters-inspector-form]',
  )
  const input = container.querySelector<HTMLTextAreaElement>(
    '[data-hidden-characters-inspector-input]',
  )
  const clearButton = container.querySelector<HTMLButtonElement>(
    '[data-hidden-characters-inspector-clear]',
  )
  const exampleButton = container.querySelector<HTMLButtonElement>(
    '[data-hidden-characters-inspector-example]',
  )
  const inputLabel = container.querySelector<HTMLElement>(
    '[data-hidden-characters-inspector-input-label]',
  )
  const countValue = container.querySelector<HTMLElement>(
    '[data-hidden-characters-inspector-count]',
  )
  const countLabel = container.querySelector<HTMLElement>(
    '[data-hidden-characters-inspector-count-label]',
  )
  const previewLabel = container.querySelector<HTMLElement>(
    '[data-hidden-characters-inspector-preview-label]',
  )
  const preview = container.querySelector<HTMLElement>(
    '[data-hidden-characters-inspector-preview]',
  )
  const empty = container.querySelector<HTMLElement>(
    '[data-hidden-characters-inspector-empty]',
  )

  if (
    !form ||
    !input ||
    !clearButton ||
    !exampleButton ||
    !inputLabel ||
    !countValue ||
    !countLabel ||
    !previewLabel ||
    !preview ||
    !empty
  ) {
    return null
  }

  return {
    form,
    input,
    clearButton,
    exampleButton,
    inputLabel,
    countValue,
    countLabel,
    previewLabel,
    preview,
    empty,
  }
}

const renderSegment = (segment: PreviewSegment, messages: Messages): string => {
  if (segment.type !== 'flagged') {
    return escapeHtml(segment.value)
  }
  const m = messages.hiddenCharactersInspector
  const labelFor = (category: HiddenCharCategory): string => {
    switch (category) {
      case 'bidi':
        return m.bidiLabel
      case 'zeroWidth':
        return m.zeroWidthLabel
      case 'control':
        return m.controlLabel
      case 'separator':
        return m.separatorLabel
      case 'confusable':
        return m.confusableLabel
      default:
        return category
    }
  }
  const categoryLabel = labelFor(segment.category)
  if (segment.category === 'confusable' && segment.target) {
    const title = `${categoryLabel} · ${m.lookalikeMessage} «${escapeHtml(segment.target)}» (${toCodePointHex(
      segment.codePoint,
    )})`
    return `<span class="hidden-characters-inspector-hidden hidden-characters-inspector-hidden--confusable" title="${escapeHtml(title)}">${escapeHtml(
      segment.value,
    )}</span>`
  }
  const title = `${categoryLabel} ${toCodePointHex(segment.codePoint)}`
  return `<span class="hidden-characters-inspector-hidden" title="${escapeHtml(title)}">${escapeHtml(
    toCodePointHex(segment.codePoint),
  )}</span>`
}

export const mountHiddenCharactersInspector = (
  container: HTMLElement,
  initialMessages: Messages,
): void => {
  const root =
    container.querySelector<HTMLElement>('[data-hidden-characters-inspector-root]') ?? container
  const elements = queryHiddenCharactersInspectorElements(container)
  if (!elements) {
    return
  }

  let messages = initialMessages
  const state = createInitialHiddenCharactersInspectorState()

  const renderPreview = (): void => {
    const segments = splitSegments(state.inputValue)
    const hiddenCount = countHiddenCharacters(state.inputValue)
    elements.countValue.textContent = String(hiddenCount)
    elements.preview.innerHTML =
      segments.length === 0 ? '' : segments.map((seg) => renderSegment(seg, messages)).join('')
    elements.empty.classList.toggle(
      'hidden-characters-inspector-empty--visible',
      hiddenCount === 0 && state.inputValue.length > 0,
    )
  }

  const syncLocale = (nextMessages: Messages): void => {
    messages = nextMessages
    elements.inputLabel.textContent = messages.hiddenCharactersInspector.inputLabel
    elements.input.placeholder = messages.hiddenCharactersInspector.inputPlaceholder
    elements.clearButton.textContent = messages.hiddenCharactersInspector.clearAction
    elements.exampleButton.textContent = messages.hiddenCharactersInspector.insertExampleAction
    elements.countLabel.textContent = messages.hiddenCharactersInspector.countLabel
    elements.previewLabel.textContent = messages.hiddenCharactersInspector.previewLabel
    elements.empty.textContent = messages.hiddenCharactersInspector.emptyLabel
    renderPreview()
  }

  hiddenCharactersInspectorLocaleSyncers.set(root, syncLocale)

  elements.input.addEventListener('input', () => {
    state.inputValue = elements.input.value
    renderPreview()
  })

  elements.clearButton.addEventListener('click', () => {
    state.inputValue = ''
    elements.input.value = ''
    renderPreview()
    elements.input.focus()
  })

  elements.exampleButton.addEventListener('click', () => {
    state.inputValue = EXAMPLE_TEXT
    elements.input.value = EXAMPLE_TEXT
    renderPreview()
    elements.input.focus()
  })

  syncLocale(messages)
}

export const updateHiddenCharactersInspectorLocale = (
  container: HTMLElement,
  messages: Messages,
): void => {
  const root =
    container.querySelector<HTMLElement>('[data-hidden-characters-inspector-root]') ?? container
  hiddenCharactersInspectorLocaleSyncers.get(root)?.(messages)
}
