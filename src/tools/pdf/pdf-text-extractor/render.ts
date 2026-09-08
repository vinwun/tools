import type { Messages } from '../../../i18n/schema.ts'
import { formatAcceptList } from '../../foundations/files.ts'
import { renderFilePicker } from '../../foundations/file-picker/render.ts'
import { ACCEPTED_PDF_TYPES } from '../pdf-utils.ts'

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

        ${renderFilePicker({
          accept: ACCEPTED_PDF_TYPES,
          browseLabel: pdfMessages.browseAction,
          emptyLabel: pdfMessages.noFileSelected,
        })}
        <p class="tool-hint" data-pdf-text-extractor-upload-hint>${pdfMessages.uploadHintLabel}: ${formatAcceptList(ACCEPTED_PDF_TYPES)}</p>
      </div>

      <div class="tool-panel pdf-text-extractor-panel pdf-text-extractor-panel-output">
        <div class="tool-panel-header pdf-text-extractor-output-header">
          <h2>${pdfMessages.outputTitle}</h2>
          <div class="pdf-text-extractor-output-controls">
            <select class="pdf-text-extractor-format-select" data-pdf-text-extractor-output aria-label="${pdfMessages.outputTitle}">
              <option value="md">${pdfMessages.outputFormatMarkdown}</option>
              <option value="txt">${pdfMessages.outputFormatText}</option>
            </select>
            <div class="tool-actions pdf-text-extractor-output-actions">
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
