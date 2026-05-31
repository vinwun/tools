import type { Messages } from '../../../i18n/schema.ts'
import type { MarkdownDisplayerState } from './types.ts'

export const renderMarkdownDisplayer = (
  messages: Messages,
  state: MarkdownDisplayerState,
): string => {
  const markdownMessages = messages.markdownDisplayer
  const inputAccept = '.md,.txt'
  const inputAcceptLabel = inputAccept.replaceAll(',', ' / ')

  return `
    <section class="tool-layout markdown-displayer-layout" data-markdown-displayer-root>
      <form class="tool-panel markdown-displayer-panel" data-markdown-displayer-form novalidate>
        <div class="file-converter-input-header">
          <label class="tool-field" for="markdown-displayer-upload-input">
            <span data-markdown-displayer-upload-label>${markdownMessages.uploadLabel}</span>
            <div class="file-converter-file-picker" data-markdown-displayer-dropzone>
              <button type="button" class="file-converter-file-button" data-markdown-displayer-file-button>${markdownMessages.uploadAction}</button>
              <span class="file-converter-file-name" data-markdown-displayer-file-name aria-live="polite">${markdownMessages.noFileSelected}</span>
            </div>
            <input
              id="markdown-displayer-upload-input"
              class="file-converter-file-input"
              type="file"
              data-markdown-displayer-file-input
              accept="${inputAccept},text/markdown,text/plain"
              hidden
            />
          </label>
          <p class="tool-hint" data-markdown-displayer-upload-hint>${markdownMessages.uploadHint}: ${inputAcceptLabel}</p>
        </div>

        <label class="tool-field" for="markdown-displayer-input">
          <span data-markdown-displayer-input-label>${markdownMessages.inputLabel}</span>
          <textarea
            id="markdown-displayer-input"
            class="markdown-displayer-input"
            data-markdown-displayer-input
            rows="10"
            spellcheck="false"
            placeholder="${markdownMessages.inputPlaceholder}"
          >${state.inputValue}</textarea>
        </label>

        <div class="markdown-displayer-actions">
          <button type="submit" class="tool-action" data-markdown-displayer-render>${markdownMessages.renderAction}</button>
          <button type="button" class="tool-action" data-markdown-displayer-clear>${markdownMessages.clearAction}</button>
        </div>
      </form>

      <section class="tool-panel markdown-displayer-panel" aria-live="polite">
        <div class="markdown-displayer-output-header">
          <h2 data-markdown-displayer-output-label>${markdownMessages.outputLabel}</h2>
          <button type="button" class="tool-action" data-markdown-displayer-download disabled>${markdownMessages.downloadAction}</button>
        </div>
        <p class="tool-status" data-markdown-displayer-status>${markdownMessages.statusEmpty}</p>
        <div class="markdown-displayer-output" data-markdown-displayer-output></div>
      </section>
    </section>
  `
}
