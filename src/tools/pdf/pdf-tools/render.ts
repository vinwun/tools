import type { Messages } from '../../../i18n/schema.ts'
import { ACCEPTED_PDF_TYPES } from './utils.ts'

export const renderPdfMergeReorderSplit = (messages: Messages): string => {
  const pdfMessages = messages.pdfTools

  return `
    <section class="tool-layout pdf-tools-layout" data-pdf-tools-root>
      <div class="tool-panel pdf-tools-panel pdf-tools-panel-upload">
        <div class="pdf-tools-panel-header">
          <div>
            <h2>${pdfMessages.uploadLabel}</h2>
            <p class="tool-hint">${pdfMessages.dropHint}</p>
          </div>
          <div class="pdf-tools-upload-actions">
            <button type="button" class="tool-action pdf-tools-browse" data-pdf-tools-browse>${pdfMessages.browseAction}</button>
            <button type="button" class="tool-action pdf-tools-clear" data-pdf-tools-clear disabled>${pdfMessages.clearAction}</button>
          </div>
        </div>

        <input class="pdf-tools-file-input" type="file" accept="${ACCEPTED_PDF_TYPES}" data-pdf-tools-file multiple hidden />
        <div class="pdf-tools-dropzone" data-pdf-tools-dropzone>
          <span data-pdf-tools-upload-hint>${pdfMessages.uploadHintLabel}: ${ACCEPTED_PDF_TYPES.replaceAll(',', ' / ')}</span>
        </div>
      </div>

      <div class="tool-panel pdf-tools-panel pdf-tools-panel-workspace">
        <div class="pdf-tools-workspace-header">
          <div>
            <h2>${pdfMessages.pageListTitle}</h2>
            <p class="tool-hint" data-pdf-tools-summary>${pdfMessages.emptyState}</p>
          </div>
          <div class="pdf-tools-selection-summary pdf-tools-visible-on-pages" data-pdf-tools-selection-summary>${pdfMessages.selectedSummary.replace('{count}', '0')}</div>
        </div>

        <p class="tool-hint pdf-tools-guidance pdf-tools-visible-on-pages" data-pdf-tools-guidance>${pdfMessages.selectionHint}</p>

        <div class="pdf-tools-list-shell">
          <div class="pdf-tools-page-list" data-pdf-tools-page-list role="listbox" aria-label="${pdfMessages.pageListTitle}"></div>
          <div class="pdf-tools-drop-end pdf-tools-visible-on-pages" data-pdf-tools-drop-end>${pdfMessages.moveToEndHint}</div>
        </div>

        <p class="tool-hint pdf-tools-reorder-hint pdf-tools-visible-on-pages">${pdfMessages.reorderHint}</p>
      </div>

      <div class="tool-panel pdf-tools-panel pdf-tools-panel-actions">
        <div class="pdf-tools-action-bar">
          <div class="pdf-tools-action-group pdf-tools-action-group-left">
            <button type="button" class="tool-action pdf-tools-keep" data-pdf-tools-keep disabled>${pdfMessages.keepSelectedAction}</button>
            <button type="button" class="tool-action pdf-tools-remove" data-pdf-tools-remove disabled>${pdfMessages.removeSelectedAction}</button>
          </div>
          <div class="pdf-tools-action-group pdf-tools-action-group-right">
            <button type="button" class="tool-action pdf-tools-download" data-pdf-tools-download disabled>${pdfMessages.downloadAction}</button>
          </div>
        </div>
      </div>
    </section>
  `
}
