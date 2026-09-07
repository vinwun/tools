import type { Messages } from '../../../i18n/schema.ts'
import type { MarkdownViewerState } from './types.ts'

export const renderMarkdownViewer = (
  messages: Messages,
  state: MarkdownViewerState,
): string => {
  const markdownMessages = messages.markdownViewer
  const inputAccept = '.md,.txt'
  const inputAcceptLabel = inputAccept.replaceAll(',', ' / ')

  return `
    <section class="tool-layout markdown-viewer-layout" data-markdown-viewer-root>
      <form class="tool-panel markdown-viewer-panel" data-markdown-viewer-form novalidate>
        <div class="file-converter-input-header">
          <label class="tool-field" for="markdown-viewer-upload-input">
            <span data-markdown-viewer-upload-label>${markdownMessages.uploadLabel}</span>
            <div class="file-converter-file-picker" data-markdown-viewer-dropzone>
              <button type="button" class="file-converter-file-button" data-markdown-viewer-file-button>${markdownMessages.uploadAction}</button>
              <span class="file-converter-file-name" data-markdown-viewer-file-name aria-live="polite">${markdownMessages.noFileSelected}</span>
            </div>
            <input
              id="markdown-viewer-upload-input"
              class="file-converter-file-input"
              type="file"
              data-markdown-viewer-file-input
              accept="${inputAccept},text/markdown,text/plain"
              hidden
            />
          </label>
          <p class="tool-hint" data-markdown-viewer-upload-hint>${markdownMessages.uploadHint}: ${inputAcceptLabel}</p>
        </div>

        <label class="tool-field" for="markdown-viewer-input">
          <span data-markdown-viewer-input-label>${markdownMessages.inputLabel}</span>
          <textarea
            id="markdown-viewer-input"
            class="markdown-viewer-input"
            data-markdown-viewer-input
            rows="10"
            spellcheck="false"
            placeholder="${markdownMessages.inputPlaceholder}"
          >${state.inputValue}</textarea>
        </label>

        <div class="markdown-viewer-actions">
          <button type="submit" class="tool-action" data-markdown-viewer-render>${markdownMessages.renderAction}</button>
          <button type="button" class="tool-action" data-markdown-viewer-clear>${markdownMessages.clearAction}</button>
        </div>
      </form>

      <section class="tool-panel markdown-viewer-panel" aria-live="polite">
        <div class="markdown-viewer-output-header">
          <h2 data-markdown-viewer-output-label>${markdownMessages.outputLabel}</h2>
          <button type="button" class="tool-action" data-markdown-viewer-download disabled>${markdownMessages.downloadAction}</button>
        </div>
        <p class="tool-status" data-markdown-viewer-status>${markdownMessages.statusEmpty}</p>
        <div class="markdown-viewer-output" data-markdown-viewer-output></div>
      </section>
    </section>
  `
}
