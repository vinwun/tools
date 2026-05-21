import type { Messages } from '../../../i18n/schema.ts'
import { ACCEPTED_PDF_TYPES } from '../pdf-tools/utils.ts'

export const renderPdfTextExtractor = (messages: Messages): string => {
  const pdfMessages = messages.pdfTextExtractor

  return `
    <section class="tool-layout pdf-text-extractor-layout" data-pdf-text-extractor-root>
      <div class="tool-panel pdf-text-extractor-panel pdf-text-extractor-panel-upload">
        <div class="pdf-text-extractor-panel-header">
          <div>
            <h2>${pdfMessages.uploadLabel}</h2>
            <p class="tool-hint">${pdfMessages.dropHint}</p>
          </div>
        </div>

        <input class="pdf-text-extractor-file-input" type="file" accept="${ACCEPTED_PDF_TYPES}" data-pdf-text-extractor-file hidden />
        <div class="file-converter-file-picker pdf-text-extractor-dropzone" data-pdf-text-extractor-dropzone>
          <button type="button" class="file-converter-file-button" data-pdf-text-extractor-browse>${pdfMessages.browseAction}</button>
          <span class="file-converter-file-name" data-pdf-text-extractor-file-name>${pdfMessages.noFileSelected}</span>
        </div>
        <p class="tool-hint" data-pdf-text-extractor-upload-hint>${pdfMessages.uploadHintLabel}: ${ACCEPTED_PDF_TYPES.replaceAll(',', ' / ')}</p>
      </div>

      <div class="tool-panel pdf-text-extractor-panel pdf-text-extractor-panel-output">
        <div class="pdf-text-extractor-output-header">
          <h2>${pdfMessages.outputTitle}</h2>
          <div class="pdf-text-extractor-output-controls">
            <select class="pdf-text-extractor-format-select" data-pdf-text-extractor-output aria-label="${pdfMessages.outputTitle}">
              <option value="md">${pdfMessages.outputFormatMarkdown}</option>
              <option value="txt">${pdfMessages.outputFormatText}</option>
            </select>
            <div class="pdf-text-extractor-output-actions">
              <button type="button" class="tool-action" data-pdf-text-extractor-download-selected disabled>${pdfMessages.downloadAction}</button>
            </div>
          </div>
        </div>
        <p class="tool-status" data-pdf-text-extractor-status>${pdfMessages.statusEmpty}</p>
      </div>

      <div class="tool-panel pdf-text-extractor-panel pdf-text-extractor-panel-results">
        <h2>${pdfMessages.resultsTitle}</h2>
        <div class="pdf-text-extractor-results" data-pdf-text-extractor-results></div>
      </div>
    </section>
  `
}
