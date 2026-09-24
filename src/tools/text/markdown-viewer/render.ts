import type { Messages } from '../../../i18n/schema.ts'
import { formatAcceptList } from '../../foundations/files.ts'
import { renderFilePicker } from '../../foundations/file-picker/render.ts'
import type { MarkdownViewerState } from './types.ts'
import { createInitialMarkdownViewerState } from './utils.ts'

export const renderMarkdownViewer = (
  messages: Messages,
  state: MarkdownViewerState = createInitialMarkdownViewerState(),
): string => {
  const markdownMessages = messages.markdownViewer
  const inputAccept = '.md,.txt'
  const inputAcceptLabel = formatAcceptList(inputAccept)

  return `
    <section class="tool-layout tool-layout-auto markdown-viewer-layout" data-markdown-viewer-root>
      <form class="tool-panel markdown-viewer-panel" data-markdown-viewer-form novalidate>
        <div class="file-converter-input-header">
          <div class="tool-field">
            <span data-markdown-viewer-upload-label>${markdownMessages.uploadLabel}</span>
            ${renderFilePicker({
              accept: `${inputAccept},text/markdown,text/plain`,
              browseLabel: markdownMessages.uploadAction,
              emptyLabel: markdownMessages.noFileSelected,
            })}
          </div>
          <p class="tool-hint" data-markdown-viewer-upload-hint>${markdownMessages.uploadHint}: ${inputAcceptLabel}</p>
        </div>

        <label class="tool-field" for="markdown-viewer-input">
          <span data-markdown-viewer-input-label>${markdownMessages.inputLabel}</span>
          <textarea
            id="markdown-viewer-input"
            class="tool-textarea markdown-viewer-input"
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

      <section class="tool-panel markdown-viewer-panel">
        <div class="tool-panel-header markdown-viewer-output-header">
          <h2 data-markdown-viewer-output-label>${markdownMessages.outputLabel}</h2>
          <button type="button" class="tool-action" data-markdown-viewer-download disabled>${markdownMessages.downloadAction}</button>
        </div>
        <p class="tool-status" role="status" data-markdown-viewer-status>${markdownMessages.statusEmpty}</p>
        <div class="markdown-viewer-output" data-markdown-viewer-output></div>
      </section>
    </section>
  `
}
