import type { Messages } from '../../../i18n/schema.ts'
import type { JsonPrettyPrinterState } from './types.ts'

export const renderJsonPrettyPrinter = (messages: Messages, state: JsonPrettyPrinterState): string => {
  const jsonMessages = messages.jsonPrettyPrinter
  const inputAccept = '.json,.txt'
  const inputAcceptLabel = inputAccept.replaceAll(',', ' / ')

  return `
    <section class="tool-layout json-pretty-printer-layout" data-json-pretty-printer-root>
      <form class="tool-panel json-pretty-printer-panel" data-json-pretty-printer-form novalidate>
        <div class="file-converter-input-header">
          <label class="tool-field" for="json-pretty-printer-upload-input">
            <span data-json-pretty-printer-upload-label>${jsonMessages.uploadLabel}</span>
            <div class="file-converter-file-picker" data-json-pretty-printer-dropzone>
              <button type="button" class="file-converter-file-button" data-json-pretty-printer-file-button>${jsonMessages.uploadAction}</button>
              <span class="file-converter-file-name" data-json-pretty-printer-file-name aria-live="polite">${jsonMessages.noFileSelected}</span>
            </div>
            <input
              id="json-pretty-printer-upload-input"
              class="file-converter-file-input"
              type="file"
              data-json-pretty-printer-file-input
              accept="${inputAccept},application/json,text/plain"
              hidden
            />
          </label>
          <p class="tool-hint" data-json-pretty-printer-upload-hint>${jsonMessages.uploadHint}: ${inputAcceptLabel}</p>
        </div>

        <label class="tool-field" for="json-pretty-printer-input">
          <span data-json-pretty-printer-input-label>${jsonMessages.inputLabel}</span>
          <textarea
            id="json-pretty-printer-input"
            class="json-pretty-printer-input"
            data-json-pretty-printer-input
            rows="10"
            spellcheck="false"
            placeholder="${jsonMessages.inputPlaceholder}"
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

      <section class="tool-panel json-pretty-printer-panel" aria-live="polite">
        <div class="json-pretty-printer-output-header">
          <h2 data-json-pretty-printer-output-label>${jsonMessages.outputLabel}</h2>
          <button type="button" class="tool-action" data-json-pretty-printer-download disabled>${jsonMessages.downloadAction}</button>
        </div>
        <p class="tool-status" data-json-pretty-printer-status>${jsonMessages.statusEmpty}</p>
        <div class="json-pretty-printer-output" data-json-pretty-printer-output></div>
      </section>
    </section>
  `
}
