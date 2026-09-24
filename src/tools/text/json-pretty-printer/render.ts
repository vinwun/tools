import type { Messages } from '../../../i18n/schema.ts'
import { renderFilePicker } from '../../foundations/file-picker/render.ts'
import { escapeHtml } from '../../foundations/dom.ts'
import type { JsonPrettyPrinterState } from './types.ts'
import { createInitialJsonPrettyPrinterState } from './utils.ts'

export const renderJsonPrettyPrinter = (
  messages: Messages,
  state: JsonPrettyPrinterState = createInitialJsonPrettyPrinterState(),
): string => {
  const jsonMessages = messages.jsonPrettyPrinter
  const inputAccept = '.json,.txt'
  const inputAcceptLabel = inputAccept.replaceAll(',', ' / ')

  return `
    <section class="tool-layout tool-layout-auto json-pretty-printer-layout" data-json-pretty-printer-root>
      <form class="tool-panel json-pretty-printer-panel" data-json-pretty-printer-form novalidate>
        <div class="file-converter-input-header">
          <div class="tool-field">
            <span data-json-pretty-printer-upload-label>${jsonMessages.uploadLabel}</span>
            ${renderFilePicker({
              accept: `${inputAccept},application/json,text/plain`,
              browseLabel: jsonMessages.uploadAction,
              emptyLabel: jsonMessages.noFileSelected,
            })}
          </div>
          <p class="tool-hint" data-json-pretty-printer-upload-hint>${jsonMessages.uploadHint}: ${inputAcceptLabel}</p>
        </div>

        <label class="tool-field" for="json-pretty-printer-input">
          <span data-json-pretty-printer-input-label>${jsonMessages.inputLabel}</span>
          <textarea
            id="json-pretty-printer-input"
            class="tool-textarea json-pretty-printer-input"
            data-json-pretty-printer-input
            rows="10"
            spellcheck="false"
            placeholder="${escapeHtml(jsonMessages.inputPlaceholder)}"
          >${state.inputValue}</textarea>
        </label>

        <div class="json-pretty-printer-controls">
          <label class="tool-field" for="json-pretty-printer-indent">
            <span data-json-pretty-printer-indent-label>${jsonMessages.indentLabel}</span>
            <select id="json-pretty-printer-indent" data-json-pretty-printer-indent>
              <option value="2" data-json-pretty-printer-indent-two ${state.indentSize === 2 ? 'selected' : ''}>${jsonMessages.indentTwoLabel}</option>
              <option value="4" data-json-pretty-printer-indent-four ${state.indentSize === 4 ? 'selected' : ''}>${jsonMessages.indentFourLabel}</option>
            </select>
          </label>
        </div>

        <div class="json-pretty-printer-actions">
          <button type="submit" class="tool-action" data-json-pretty-printer-format>${jsonMessages.formatAction}</button>
          <button type="button" class="tool-action" data-json-pretty-printer-clear>${jsonMessages.clearAction}</button>
        </div>
      </form>

      <section class="tool-panel json-pretty-printer-panel">
        <div class="tool-panel-header json-pretty-printer-output-header">
          <h2 data-json-pretty-printer-output-label>${jsonMessages.outputLabel}</h2>
          <button type="button" class="tool-action" data-json-pretty-printer-download disabled>${jsonMessages.downloadAction}</button>
        </div>
        <p class="tool-status" role="status" data-json-pretty-printer-status>${jsonMessages.statusEmpty}</p>
        <div class="json-pretty-printer-output" data-json-pretty-printer-output></div>
      </section>
    </section>
  `
}
