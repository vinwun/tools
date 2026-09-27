import type { Messages } from '../../../i18n/schema.ts'
import type { HiddenCharCategory, HiddenCharactersInspectorElements } from './types.ts'
import {
  countHiddenCharacters,
  createInitialHiddenCharactersInspectorState,
  EXAMPLE_TEXT,
  splitSegments,
  toCodePointHex,
  type PreviewSegment,
} from './utils.ts'
import { escapeHtml, queryRequired } from '../../foundations/dom.ts'
import type { MountTool } from '../../types.ts'

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
      case 'emojiJoiner':
        return m.emojiJoinerLabel
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
  const joinerClass = segment.category === 'emojiJoiner' ? ' hidden-characters-inspector-hidden--joiner' : ''
  return `<span class="hidden-characters-inspector-hidden${joinerClass}" title="${escapeHtml(title)}">${escapeHtml(
    toCodePointHex(segment.codePoint),
  )}</span>`
}

export const mountHiddenCharactersInspector: MountTool = (container, initialMessages) => {
  const elements = queryRequired<HiddenCharactersInspectorElements>(container, {
    input: '[data-hidden-characters-inspector-input]',
    clearButton: '[data-hidden-characters-inspector-clear]',
    exampleButton: '[data-hidden-characters-inspector-example]',
    inputLabel: '[data-hidden-characters-inspector-input-label]',
    countValue: '[data-hidden-characters-inspector-count]',
    countLabel: '[data-hidden-characters-inspector-count-label]',
    previewLabel: '[data-hidden-characters-inspector-preview-label]',
    preview: '[data-hidden-characters-inspector-preview]',
    empty: '[data-hidden-characters-inspector-empty]',
  })
  if (!elements) {
    return {}
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
  return { updateLocale: syncLocale }
}
