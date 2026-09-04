import type { Messages } from '../../../i18n/schema.ts'
import type { HiddenCharactersInspectorState } from './types.ts'

export const renderHiddenCharactersInspector = (
  messages: Messages,
  state: HiddenCharactersInspectorState,
): string => {
  const m = messages.hiddenCharactersInspector
  return `
    <section class="tool-layout hidden-characters-inspector-layout" data-hidden-characters-inspector-root>
      <form class="tool-panel hidden-characters-inspector-panel" data-hidden-characters-inspector-form novalidate>
        <div class="hidden-characters-inspector-head">
          <label class="hidden-characters-inspector-head-label" for="hidden-characters-inspector-input" data-hidden-characters-inspector-input-label>${m.inputLabel}</label>
          <div class="hidden-characters-inspector-actions">
            <button type="button" class="tool-action" data-hidden-characters-inspector-example>${m.insertExampleAction}</button>
            <button type="button" class="tool-action hidden-characters-inspector-clear" data-hidden-characters-inspector-clear>${m.clearAction}</button>
          </div>
        </div>
        <textarea
          id="hidden-characters-inspector-input"
          class="hidden-characters-inspector-input"
          data-hidden-characters-inspector-input
          rows="10"
          spellcheck="false"
          placeholder="${m.inputPlaceholder}"
        >${state.inputValue}</textarea>
      </form>

      <section class="tool-panel hidden-characters-inspector-panel" aria-live="polite">
        <div class="hidden-characters-inspector-count">
          <span class="hidden-characters-inspector-count-value" data-hidden-characters-inspector-count>0</span>
          <span data-hidden-characters-inspector-count-label>${m.countLabel}</span>
        </div>
        <h2 data-hidden-characters-inspector-preview-label>${m.previewLabel}</h2>
        <p class="hidden-characters-inspector-empty hidden-characters-inspector-empty--visible" data-hidden-characters-inspector-empty>${m.emptyLabel}</p>
        <div class="hidden-characters-inspector-preview" data-hidden-characters-inspector-preview></div>
      </section>
    </section>`
}
